const test = require("node:test");
const assert = require("node:assert/strict");
const dashboardRepo = require("./dashboard.repository");
const dashboardService = require("./dashboard.service");

test("getOverview returns DEMO_OVERVIEW fallback when user has no connected accounts or scheduled posts", async () => {
  const origGetConnected = dashboardRepo.getConnectedAccounts;
  const origGetScheduled = dashboardRepo.getScheduledPosts;

  dashboardRepo.getConnectedAccounts = async () => [];
  dashboardRepo.getScheduledPosts = async () => [];

  try {
    const res = await dashboardService.getOverview("test-user-id");
    assert.equal(res.kpis.total_followers, "248.5K");
    assert.equal(res.connected_accounts.length, 4);
    assert.equal(res.account_performance.length, 4);
  } finally {
    dashboardRepo.getConnectedAccounts = origGetConnected;
    dashboardRepo.getScheduledPosts = origGetScheduled;
  }
});
