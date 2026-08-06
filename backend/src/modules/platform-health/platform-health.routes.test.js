const { test } = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const supertest = require("supertest");

require("../../test-utils/env");

const app = require("../../app");

function tokenFor(role, id = "1") {
  return jwt.sign({ id, role }, process.env.JWT_SECRET);
}

test("GET /api/platform-health rejects requests with no session", async () => {
  const response = await supertest(app).get("/api/platform-health");
  assert.equal(response.status, 401);
});

test("GET /api/platform-health rejects a non-admin session", async () => {
  const response = await supertest(app)
    .get("/api/platform-health")
    .set("Cookie", `auth-token=${tokenFor("user")}`);

  assert.equal(response.status, 403);
});

test("GET /api/platform-health lets an admin through and returns secrets readiness report", async () => {
  const response = await supertest(app)
    .get("/api/platform-health")
    .set("Cookie", `auth-token=${tokenFor("admin")}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.ok(response.body.data.secretsReadiness);
});

