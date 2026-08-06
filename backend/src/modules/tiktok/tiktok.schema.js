const { z } = require("zod");

exports.publishVideoSchema = z.object({
  body: z.object({
    socialAccountId: z.string().min(1, "socialAccountId is required"),
    videoUrl: z.string().url("videoUrl must be a valid URL"),
    title: z.string().max(2200, "title cannot exceed 2200 characters").optional(),
    privacyLevel: z
      .enum(["PUBLIC_TO_EVERYONE", "MUTUAL_FOLLOW_FRIENDS", "FOLLOWER_OF_CREATOR", "SELF_ONLY"])
      .optional(),
    disableComment: z.boolean().optional(),
    disableDuet: z.boolean().optional(),
    disableStitch: z.boolean().optional(),
  }),
});

exports.refreshTokenSchema = z.object({
  body: z.object({
    socialAccountId: z.string().min(1, "socialAccountId is required"),
  }),
});
