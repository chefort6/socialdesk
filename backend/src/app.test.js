const { test } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const supertest = require("supertest");

require("./test-utils/env");
process.env.CORS_ALLOWED_ORIGINS = "http://localhost:3000,https://app.socialdesk.example";
process.env.TRUST_PROXY = "1";
process.env.JSON_BODY_LIMIT = "1kb";

const app = require("./app");
const { handleError } = require("./shared/middleware/error.middleware");
const { errorResponse } = require("./shared/utils/response.util");

test("allows requests from a configured frontend origin", async () => {
  const response = await supertest(app)
    .get("/api/")
    .set("Origin", "https://app.socialdesk.example");

  assert.equal(response.status, 200);
  assert.equal(response.headers["access-control-allow-origin"], "https://app.socialdesk.example");
  assert.equal(response.headers["access-control-allow-credentials"], "true");
});

test("allows server-to-server requests without an Origin header", async () => {
  const response = await supertest(app).get("/api/");
  assert.equal(response.status, 200);
});

test("rejects browser requests from an unknown origin", async () => {
  const response = await supertest(app)
    .get("/api/")
    .set("Origin", "https://evil.example");

  assert.equal(response.status, 403);
  assert.deepEqual(response.body, { success: false, error: "Origin not allowed" });
});

test("uses the configured proxy trust value", () => {
  assert.equal(app.get("trust proxy"), 1);
});

test("rejects oversized JSON with a safe 413 response", async () => {
  const response = await supertest(app)
    .post("/api/auth/login")
    .set("Content-Type", "application/json")
    .send(JSON.stringify({ padding: "x".repeat(2048) }));

  assert.equal(response.status, 413);
  assert.deepEqual(response.body, { success: false, error: "Request body too large" });
});

test("rejects malformed JSON with a safe 400 response", async () => {
  const response = await supertest(app)
    .post("/api/auth/login")
    .set("Content-Type", "application/json")
    .send('{"email":');

  assert.equal(response.status, 400);
  assert.deepEqual(response.body, { success: false, error: "Invalid JSON body" });
});

test("returns a consistent JSON 404 for unknown routes", async () => {
  const response = await supertest(app).get("/api/does-not-exist");
  assert.equal(response.status, 404);
  assert.deepEqual(response.body, { success: false, error: "Route not found" });
});

test("hides handled and unexpected error details in production", async (t) => {
  const originalNodeEnv = process.env.NODE_ENV;
  t.after(() => {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
  });
  process.env.NODE_ENV = "production";

  const errorApp = express();
  errorApp.get("/handled", (req, res) => {
    return errorResponse(res, "database response and credentials", 500);
  });
  errorApp.get("/boom", () => {
    throw new Error("database path and credentials");
  });
  errorApp.use(handleError);

  for (const path of ["/handled", "/boom"]) {
    const response = await supertest(errorApp).get(path);
    assert.equal(response.status, 500);
    assert.deepEqual(response.body, { success: false, error: "Internal server error" });
  }
});
