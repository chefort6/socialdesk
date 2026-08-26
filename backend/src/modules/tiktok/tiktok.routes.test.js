const { test } = require("node:test");
const assert = require("node:assert/strict");
const supertest = require("supertest");

require("../../test-utils/env");

const tiktokService = require("./tiktok.service");
const dbService = require("../social-connections/social-connections.service");
const app = require("../../app");

// --- OAuth redirect ---

test("GET /api/auth/tiktok/oauth requires a userId", async () => {
  const response = await supertest(app).get("/api/auth/tiktok/oauth");

  assert.equal(response.status, 400);
  assert.deepEqual(response.body, { success: false, error: "userId is required" });
});

test("GET /api/auth/tiktok/oauth redirects with a secure production PKCE cookie", async (t) => {
  const originalNodeEnv = process.env.NODE_ENV;
  t.after(() => {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
  });
  process.env.NODE_ENV = "production";

  const response = await supertest(app).get("/api/auth/tiktok/oauth?userId=user-123");

  assert.equal(response.status, 302);
  assert.match(response.headers.location, /tiktok\.com\/v2\/auth\/authorize/);
  assert.match(response.headers.location, new RegExp(`client_key=${process.env.TIKTOK_CLIENT_KEY}`));
  assert.match(response.headers.location, /code_challenge=/);
  assert.match(response.headers.location, /code_challenge_method=S256/);
  assert.match(response.headers.location, /state=user-123/);
  const cookie = response.headers["set-cookie"]?.[0] || "";
  assert.match(cookie, /tiktok_code_verifier=/);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /Secure/);
  assert.match(cookie, /SameSite=Lax/);
});

// --- OAuth callback ---

test("GET /api/auth/tiktok/callback requires an authorization code", async () => {
  const response = await supertest(app).get("/api/auth/tiktok/callback?state=user-123");

  assert.equal(response.status, 400);
  assert.deepEqual(response.body, { success: false, error: "Authorization code missing" });
});

test("GET /api/auth/tiktok/callback requires userId (state)", async () => {
  const response = await supertest(app).get("/api/auth/tiktok/callback?code=abc");

  assert.equal(response.status, 400);
  assert.deepEqual(response.body, { success: false, error: "userId (state) missing" });
});

test("GET /api/auth/tiktok/callback links the TikTok account on success", async (t) => {
  t.mock.method(tiktokService, "handleTikTokOAuth", async () => ({
    access_token: "tiktok-access-token",
    refresh_token: "tiktok-refresh-token",
    expires_in: 86400,
    token_type: "Bearer",
    scope: "user.info.basic,video.upload,video.publish",
  }));

  t.mock.method(tiktokService, "getUserProfile", async () => ({
    open_id: "tiktok-open-id-123",
    username: "testcreator",
    display_name: "Test Creator",
    avatar_url: "https://example.com/avatar.jpg",
  }));

  t.mock.method(dbService, "getPlatformId", async () => 5);
  t.mock.method(dbService, "upsertSocialAccount", async () => ({
    id: "account-uuid-123",
    user_id: "user-123",
    platform_id: 5,
    external_id: "tiktok-open-id-123",
    username: "testcreator",
  }));

  t.mock.method(dbService, "upsertOAuthToken", async () => ({
    id: "token-uuid-123",
    social_account_id: "account-uuid-123",
  }));

  const response = await supertest(app)
    .get("/api/auth/tiktok/callback?code=valid-code&state=user-123")
    .set("Cookie", ["tiktok_code_verifier=test-verifier"]);

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data.message, "TikTok account linked successfully");
  assert.equal(response.body.data.account.username, "testcreator");
});

// --- Publish Video ---

test("POST /api/auth/tiktok/post validates input schema", async () => {
  const response = await supertest(app).post("/api/auth/tiktok/post").send({});

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
});

test("POST /api/auth/tiktok/post publishes video on valid payload", async (t) => {
  t.mock.method(tiktokService, "publishTikTokVideo", async () => ({
    data: { publish_id: "pub_12345" },
  }));

  const response = await supertest(app)
    .post("/api/auth/tiktok/post")
    .send({
      socialAccountId: "11111111-1111-1111-1111-111111111111",
      videoUrl: "https://example.com/sample.mp4",
      title: "Check out this TikTok video!",
    });

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data.result.data.publish_id, "pub_12345");
});

// --- Token Refresh ---

test("POST /api/auth/tiktok/refresh validates socialAccountId", async () => {
  const response = await supertest(app).post("/api/auth/tiktok/refresh").send({});

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
});

test("POST /api/auth/tiktok/refresh refreshes token on valid request", async (t) => {
  t.mock.method(tiktokService, "refreshOAuthToken", async () => ({
    id: "token-uuid-123",
    access_token: "new-access-token",
  }));

  const response = await supertest(app)
    .post("/api/auth/tiktok/refresh")
    .send({
      socialAccountId: "11111111-1111-1111-1111-111111111111",
    });

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data.updatedToken.access_token, "new-access-token");
});
