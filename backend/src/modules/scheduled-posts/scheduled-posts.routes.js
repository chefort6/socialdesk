const express = require("express");

const scheduledPostsController = require("./scheduled-posts.controller");
const { validate } = require("../../shared/middleware/validate.middleware");
const { authenticate, requireAdmin } = require("../../shared/middleware/auth.middleware");
const { schedulePostSchema, cancelScheduleSchema } = require("./scheduled-posts.schema");

const router = express.Router();

// Admin operational queue health & failed jobs inspection
router.get("/queue/health", authenticate, requireAdmin, scheduledPostsController.getQueueHealth);
router.get("/queue/failed", authenticate, requireAdmin, scheduledPostsController.getFailedJobs);
router.get("/failed-targets", authenticate, requireAdmin, scheduledPostsController.getFailedPublishTargets);

// Schedule & cancel endpoints
router.post("/:postId/jobs", validate(schedulePostSchema), scheduledPostsController.schedulePostJobs);
router.delete("/:postId/jobs", validate(cancelScheduleSchema), scheduledPostsController.cancelPostJobs);

module.exports = router;
