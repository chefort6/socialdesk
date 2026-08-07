const { test } = require("node:test");
const assert = require("node:assert/strict");
const supertest = require("supertest");

require("../../test-utils/env");

const twitterService = require("./twitter.service");
const dbService = require("../social-connections/social-connections.service");
const app = require("../../app");

// --- OAuth redirect ---

test("GET /api/auth/twitter/oauth requires a userId", async () => {
  const response = await supertest(app).get("/api/auth/twitter/oauth");

  assert.equal(response.status, 400);
  assert.deepEqual(response.body, { success: false, error: "userId is required" });
});

test("GET /api/auth/twitter/oauth redirects to Twitter OAuth2 authorize screen", async () => {
  const response = await supertest(app).get("/api/auth/twitter/oauth?userId=user-123");

  assert.equal(response.status, 302);
  assert.match(response.headers.location, /twitter\.com\/i\/oauth2\/authorize/);
  assert.match(response.headers.location, new RegExp(`client_id=${process.env.TWITTER_CLIENT_ID}`));
  assert.match(response.headers.location, /code_challenge=/);
  assert.match(response.headers.location, /code_challenge_method=S256/);
  assert.match(response.headers.location, /state=user-123/);
});

// --- OAuth callback ---

test("GET /api/auth/twitter/callback requires an authorization code", async () => {
  const response = await supertest(app).get("/api/auth/twitter/callback?state=user-123");

  assert.equal(response.status, 400);
  assert.deepEqual(response.body, { success: false, error: "Authorization code missing" });
});

test("GET /api/auth/twitter/callback requires userId (state)", async () => {
  const response = await supertest(app).get("/api/auth/twitter/callback?code=abc");

  assert.equal(response.status, 400);
  assert.deepEqual(response.body, { success: false, error: "userId (state) missing" });
});

test("GET /api/auth/twitter/callback links the Twitter account on success", async (t) => {
  t.mock.method(twitterService, "handleTwitterOAuth", async () => ({
    access_token: "twitter-access-token",
    refresh_token: "twitter-refresh-token",
    token_type: "Bearer",
    expires_in: 7200,
    scope: "tweet.read tweet.write users.read offline.access",
  }));
  t.mock.method(twitterService, "getUserProfile", async () => ({
    id: "twitter-user-123",
    name: "John Doe",
    username: "johndoe",
    profileImageUrl: "https://pbs.twimg.com/profile_images/123.jpg",
  }));
  t.mock.method(dbService, "getPlatformId", async () => "platform-x-id");
  t.mock.method(dbService, "upsertSocialAccount", async () => ({
    id: "account-uuid-x",
    username: "johndoe",
  }));
  t.mock.method(dbService, "upsertOAuthToken", async () => ({}));

  const response = await supertest(app)
    .get("/api/auth/twitter/callback?code=auth-code&state=user-123&code_verifier=test-verifier");

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    success: true,
    data: {
      message: "X (Twitter) account linked successfully",
      account: { id: "account-uuid-x", username: "johndoe" },
    },
  });
});

test("GET /api/auth/twitter/callback returns 500 when token exchange fails", async (t) => {
  t.mock.method(twitterService, "handleTwitterOAuth", async () => {
    throw new Error("invalid_grant");
  });

  const response = await supertest(app)
    .get("/api/auth/twitter/callback?code=bad-code&state=user-123&code_verifier=test-verifier");

  assert.equal(response.status, 500);
  assert.equal(response.body.error, "invalid_grant");
  assert.equal(response.body.success, false);
});

// --- Tweet Posting ---

test("POST /api/auth/twitter/post rejects invalid request body", async () => {
  const response = await supertest(app).post("/api/auth/twitter/post").send({});

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
});

test("POST /api/auth/twitter/post posts tweet successfully", async (t) => {
  t.mock.method(twitterService, "postTweet", async () => ({
    data: {
      id: "tweet-id-999",
      text: "Hello Twitter!",
    },
  }));

  const response = await supertest(app)
    .post("/api/auth/twitter/post")
    .send({
      accessToken: "valid-access-token",
      text: "Hello Twitter!",
    });

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.deepEqual(response.body.data.tweet, {
    data: {
      id: "tweet-id-999",
      text: "Hello Twitter!",
    },
  });
});

// --- Token Refresh ---

test("POST /api/auth/twitter/refresh refreshes OAuth token", async (t) => {
  t.mock.method(twitterService, "refreshOAuthToken", async () => ({
    access_token: "new-access-token",
    refresh_token: "new-refresh-token",
  }));

  const response = await supertest(app)
    .post("/api/auth/twitter/refresh")
    .send({ socialAccountId: "account-uuid-x" });

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.deepEqual(response.body.data.updatedToken, {
    access_token: "new-access-token",
    refresh_token: "new-refresh-token",
  });
});
