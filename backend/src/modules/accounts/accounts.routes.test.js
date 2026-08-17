const { test } = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const supertest = require("supertest");

require("../../test-utils/env");

const accountsRepository = require("./accounts.repository");
const socialConnectionsRepository = require("../social-connections/social-connections.repository");
const scheduledPostsQueue = require("../scheduled-posts/scheduled-posts.queue");
const app = require("../../app");

const ACCOUNT_ID = "f47ac10b-58cc-4372-a567-0e02b2c3d479";

function tokenFor(id = "user-1", role = "user") {
  return jwt.sign({ id, role }, process.env.JWT_SECRET);
}

function restoreEnv(t, key) {
  const value = process.env[key];
  t.after(() => {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  });
}

test("GET /api/accounts rejects requests with no session", async () => {
  const response = await supertest(app).get("/api/accounts");
  assert.equal(response.status, 401);
});

test("GET /api/accounts rejects a tampered token", async () => {
  const response = await supertest(app)
    .get("/api/accounts")
    .set("Cookie", "auth-token=garbage");
  assert.equal(response.status, 401);
});

test("GET /api/accounts returns the user's connected accounts", async (t) => {
  t.mock.method(accountsRepository, "findActiveByUser", async () => ({
    accounts: [
      {
        id: ACCOUNT_ID,
        username: "test",
        is_active: true,
        platforms: { id: 1, code: "facebook", name: "Facebook" },
      },
    ],
    error: null,
  }));

  const response = await supertest(app)
    .get("/api/accounts")
    .set("Cookie", `auth-token=${tokenFor()}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data.length, 1);
  assert.equal(response.body.data[0].platforms.code, "facebook");
});

test("POST /api/accounts rejects requests with no session", async () => {
  const response = await supertest(app)
    .post("/api/accounts")
    .send({ platformCode: "facebook", external_id: "mock_fb_1" });

  assert.equal(response.status, 401);
});

test("POST /api/accounts rejects regular users", async () => {
  const response = await supertest(app)
    .post("/api/accounts")
    .set("Cookie", `auth-token=${tokenFor()}`)
    .send({ platformCode: "facebook", external_id: "mock_fb_1" });

  assert.equal(response.status, 403);
});

test("POST /api/accounts creates a manual account for an enabled non-production admin", async (t) => {
  restoreEnv(t, "NODE_ENV");
  restoreEnv(t, "MANUAL_ACCOUNT_CREATION_ENABLED");
  process.env.NODE_ENV = "test";
  process.env.MANUAL_ACCOUNT_CREATION_ENABLED = "true";

  t.mock.method(socialConnectionsRepository, "getPlatformId", async () => 1);
  t.mock.method(accountsRepository, "insertAccount", async (data) => ({
    account: {
      id: ACCOUNT_ID,
      username: data.username,
      is_active: true,
      platforms: { id: 1, code: "facebook", name: "Facebook" },
    },
    error: null,
  }));

  const response = await supertest(app)
    .post("/api/accounts")
    .set("Cookie", `auth-token=${tokenFor("admin-1", "admin")}`)
    .send({ platformCode: "facebook", external_id: "mock_fb_1", username: "test" });

  assert.equal(response.status, 201);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data.id, ACCOUNT_ID);
});

test("POST /api/accounts rejects an admin when manual creation is disabled", async (t) => {
  restoreEnv(t, "MANUAL_ACCOUNT_CREATION_ENABLED");
  process.env.MANUAL_ACCOUNT_CREATION_ENABLED = "false";

  const response = await supertest(app)
    .post("/api/accounts")
    .set("Cookie", `auth-token=${tokenFor("admin-1", "admin")}`)
    .send({ platformCode: "facebook", external_id: "mock_fb_1" });

  assert.equal(response.status, 403);
});

test("POST /api/accounts rejects an admin in production when manually enabled", async (t) => {
  restoreEnv(t, "NODE_ENV");
  restoreEnv(t, "MANUAL_ACCOUNT_CREATION_ENABLED");
  process.env.NODE_ENV = "production";
  process.env.MANUAL_ACCOUNT_CREATION_ENABLED = "true";

  const response = await supertest(app)
    .post("/api/accounts")
    .set("Cookie", `auth-token=${tokenFor("admin-1", "admin")}`)
    .send({ platformCode: "facebook", external_id: "mock_fb_1" });

  assert.equal(response.status, 403);
});

test("POST /api/accounts rejects a missing external_id", async () => {
  const response = await supertest(app)
    .post("/api/accounts")
    .set("Cookie", `auth-token=${tokenFor("admin-1", "admin")}`)
    .send({ platformCode: "facebook" });

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
});

test("POST /api/accounts returns 400 for an unknown platform", async (t) => {
  t.mock.method(socialConnectionsRepository, "getPlatformId", async (code) => {
    throw new Error(`Platform not found for code: ${code}`);
  });

  const response = await supertest(app)
    .post("/api/accounts")
    .set("Cookie", `auth-token=${tokenFor("admin-1", "admin")}`)
    .send({ platformCode: "nope", external_id: "x" });

  assert.equal(response.status, 400);
  assert.match(response.body.error, /platform not found/i);
});

test("PATCH /api/accounts/:id updates account status", async (t) => {
  t.mock.method(accountsRepository, "updateForUser", async (id, userId, fields) => ({
    account: {
      id,
      is_active: fields.is_active,
      platforms: { id: 1, code: "facebook", name: "Facebook" },
    },
    error: null,
  }));

  const response = await supertest(app)
    .patch(`/api/accounts/${ACCOUNT_ID}`)
    .set("Cookie", `auth-token=${tokenFor()}`)
    .send({ is_active: false });

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data.is_active, false);
});

test("PATCH /api/accounts/:id returns 404 when the account is not owned", async (t) => {
  t.mock.method(accountsRepository, "updateForUser", async () => ({
    account: null,
    error: null,
  }));

  const response = await supertest(app)
    .patch(`/api/accounts/${ACCOUNT_ID}`)
    .set("Cookie", `auth-token=${tokenFor()}`)
    .send({ is_active: true });

  assert.equal(response.status, 404);
  assert.equal(response.body.error, "Account not found");
});

test("PATCH /api/accounts/:id rejects an empty body", async () => {
  const response = await supertest(app)
    .patch(`/api/accounts/${ACCOUNT_ID}`)
    .set("Cookie", `auth-token=${tokenFor()}`)
    .send({});

  assert.equal(response.status, 400);
});

test("PATCH /api/accounts/:id rejects an invalid uuid", async () => {
  const response = await supertest(app)
    .patch("/api/accounts/not-a-uuid")
    .set("Cookie", `auth-token=${tokenFor()}`)
    .send({ is_active: true });

  assert.equal(response.status, 400);
});

test("DELETE /api/accounts/:id soft-disconnects the account", async (t) => {
  t.mock.method(scheduledPostsQueue, "cancelPostTargetsByAccountId", async () => {});
  t.mock.method(accountsRepository, "updateForUser", async (id, userId, fields) => {
    assert.equal(fields.is_active, false);
    return { account: { id, is_active: false }, error: null };
  });

  const response = await supertest(app)
    .delete(`/api/accounts/${ACCOUNT_ID}`)
    .set("Cookie", `auth-token=${tokenFor()}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data.is_active, false);
});

test("DELETE /api/accounts/:id returns 404 when the account is not owned", async (t) => {
  t.mock.method(scheduledPostsQueue, "cancelPostTargetsByAccountId", async () => {});
  t.mock.method(accountsRepository, "updateForUser", async () => ({
    account: null,
    error: null,
  }));

  const response = await supertest(app)
    .delete(`/api/accounts/${ACCOUNT_ID}`)
    .set("Cookie", `auth-token=${tokenFor()}`);

  assert.equal(response.status, 404);
});
