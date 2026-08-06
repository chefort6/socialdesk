const { z } = require("zod");

exports.postTweetSchema = z.object({
  body: z.object({
    accessToken: z.string().min(1, "accessToken is required"),
    text: z.string().min(1, "text is required").max(280, "text cannot exceed 280 characters"),
    mediaIds: z.array(z.string()).optional(),
  }),
});

exports.refreshTokenSchema = z.object({
  body: z.object({
    socialAccountId: z.string().min(1, "socialAccountId is required"),
  }),
});
