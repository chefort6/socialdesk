const express = require("express");
const tiktokController = require("./tiktok.controller");

const router = express.Router();

const { validate } = require("../../shared/middleware/validate.middleware");
const { publishVideoSchema, refreshTokenSchema } = require("./tiktok.schema");

router.get("/oauth", tiktokController.redirectToTikTok);
router.get("/callback", tiktokController.handleTikTokCallback);
router.post("/post", validate(publishVideoSchema), tiktokController.postVideo);
router.post("/refresh", validate(refreshTokenSchema), tiktokController.refreshToken);

module.exports = router;
