const scheduledPostsQueue = require("./scheduled-posts.queue");
const { successResponse, errorResponse } = require("../../shared/utils/response.util");

exports.schedulePostJobs = async (req, res) => {
  try {
    const result = await scheduledPostsQueue.schedulePostTargets({
      postId: req.params.postId,
    });

    return successResponse(res, result);
  } catch (error) {
    console.error("Failed to schedule post jobs:", error.message || error);
    return errorResponse(res, error.message || "Failed to schedule post jobs", 500);
  }
};

exports.cancelPostJobs = async (req, res) => {
  try {
    const result = await scheduledPostsQueue.cancelPostTargets({
      postId: req.params.postId,
    });

    return successResponse(res, result);
  } catch (error) {
    console.error("Failed to cancel post jobs:", error.message || error);
    return errorResponse(res, error.message || "Failed to cancel post jobs", 500);
  }
};

exports.getQueueHealth = async (req, res) => {
  try {
    const health = await scheduledPostsQueue.getQueueHealth();
    return successResponse(res, health);
  } catch (error) {
    console.error("Failed to fetch queue health:", error.message || error);
    return errorResponse(res, error.message || "Failed to fetch queue health", 500);
  }
};

exports.getFailedJobs = async (req, res) => {
  try {
    const limit = Number.parseInt(req.query.limit || "50", 10);
    const failedJobs = await scheduledPostsQueue.getFailedJobs({ limit });
    return successResponse(res, { failedJobs, count: failedJobs.length });
  } catch (error) {
    console.error("Failed to fetch failed queue jobs:", error.message || error);
    return errorResponse(res, error.message || "Failed to fetch failed queue jobs", 500);
  }
};

exports.getFailedPublishTargets = async (req, res) => {
  try {
    const limit = Number.parseInt(req.query.limit || "50", 10);
    const offset = Number.parseInt(req.query.offset || "0", 10);
    const scheduledPostsService = require("./scheduled-posts.service");
    const failedTargets = await scheduledPostsService.getFailedPublishTargets({ limit, offset });
    return successResponse(res, { failedTargets, count: failedTargets.length });
  } catch (error) {
    console.error("Failed to fetch failed publish targets:", error.message || error);
    return errorResponse(res, error.message || "Failed to fetch failed publish targets", 500);
  }
};

