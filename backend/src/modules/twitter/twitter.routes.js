const express = require("express");
const twitterController = require("./twitter.controller");

const router = express.Router();

const { validate } = require("../../shared/middleware/validate.middleware");
const { postTweetSchema, refreshTokenSchema } = require("./twitter.schema");

router.get("/oauth", twitterController.redirectToTwitter);
router.get("/callback", twitterController.handleTwitterCallback);
router.post("/post", validate(postTweetSchema), twitterController.postTweet);
router.post("/refresh", validate(refreshTokenSchema), twitterController.refreshToken);

module.exports = router;
