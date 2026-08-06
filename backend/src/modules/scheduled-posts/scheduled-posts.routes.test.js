const { test } = require("node:test");
const assert = require("node:assert/strict");
const supertest = require("supertest");
const jwt = require("jsonwebtoken");

require("../../test-utils/env");

const app = require("../../app");
const scheduledPostsQueue = require("./scheduled-posts.queue");
const scheduledPostsService = require("./scheduled-posts.service");

const secret = process.env.JWT_SECRET || "test-jwt-secret";

const createToken = (role = "admin", userId = "user-admin-123") => {
  return jwt.sign({ id: userId, sub: userId, role, email: "admin@example.com" }, secret, {
    expiresIn: "1h",
  });
};

test("GET /api/scheduled-posts/queue/health requires authentication", async () => {
  const response = await supertest(app).get("/api/scheduled-posts/queue/health");
  assert.equal(response.status, 401);
});

test("GET /api/scheduled-posts/queue/health rejects non-admin users", async () => {
  const userToken = createToken("user", "regular-user-1");
  const response = await supertest(app)
    .get("/api/scheduled-posts/queue/health")
    .set("Authorization", `Bearer ${userToken}`);

  assert.equal(response.status, 403);
});

test("GET /api/scheduled-posts/queue/health returns queue status for admins", async (t) => {
  t.mock.method(scheduledPostsQueue, "getQueueHealth", async () => ({
    enabled: true,
    status: "healthy",
    redis: { host: "127.0.0.1", port: 6379, connected: true },
    publishingQueue: { name: "scheduled-posts-publisher", counts: { waiting: 0, active: 0 } },
    schedulerQueue: { name: "scheduled-posts-scheduler", counts: { waiting: 0, active: 0 } },
    config: { recoveryEnabled: true, concurrency: 5 },
  }));

  const adminToken = createToken("admin", "admin-user-1");
  const response = await supertest(app)
    .get("/api/scheduled-posts/queue/health")
    .set("Authorization", `Bearer ${adminToken}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data.status, "healthy");
  assert.equal(response.body.data.enabled, true);
});

test("GET /api/scheduled-posts/queue/failed returns failed BullMQ jobs for admins", async (t) => {
  t.mock.method(scheduledPostsQueue, "getFailedJobs", async () => [
    {
      id: "job-101",
      name: "publish-target",
      failedReason: "Invalid OAuth token",
      attemptsMade: 3,
    },
  ]);

  const adminToken = createToken("admin", "admin-user-1");
  const response = await supertest(app)
    .get("/api/scheduled-posts/queue/failed")
    .set("Authorization", `Bearer ${adminToken}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data.count, 1);
  assert.equal(response.body.data.failedJobs[0].id, "job-101");
});

test("GET /api/scheduled-posts/failed-targets returns failed targets from repository for admins", async (t) => {
  t.mock.method(scheduledPostsService, "getFailedPublishTargets", async () => [
    {
      id: "target-uuid-1",
      post_id: "post-uuid-1",
      status: "failed",
      error_message: "OAuth token expired",
      posts: { title: "Test Scheduled Post" },
      social_accounts: { display_name: "Test Account", platforms: { code: "facebook" } },
    },
  ]);

  const adminToken = createToken("admin", "admin-user-1");
  const response = await supertest(app)
    .get("/api/scheduled-posts/failed-targets")
    .set("Authorization", `Bearer ${adminToken}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data.count, 1);
  assert.equal(response.body.data.failedTargets[0].error_message, "OAuth token expired");
});
