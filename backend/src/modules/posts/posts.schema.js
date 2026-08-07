const { z } = require("zod");

const POST_STATUSES = ["draft", "scheduled", "published", "failed"];

/**
 * Schema for GET / — optional query-string filters.
 */
exports.listPostsQuerySchema = z.object({
  query: z.object({
    status: z.string().optional(),
    platform: z.string().optional(),
  }),
});

/**
 * Schema for GET /:id and DELETE /:id — validates the UUID param.
 */
exports.postIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid post id format"),
  }),
});

/**
 * Schema for POST / — requires at least body_text or media_urls,
 * and scheduled_at when status is "scheduled".
 */
exports.createPostSchema = z.object({
  body: z
    .object({
      title: z.string().max(500).optional(),
      body_text: z.string().optional(),
      media_urls: z.array(z.string()).optional(),
      thumbnail_url: z.string().optional().nullable(),
      hashtags: z.array(z.string()).optional(),
      status: z.enum(POST_STATUSES).optional().default("draft"),
      scheduled_at: z.string().optional().nullable(),
      content_type_id: z.number().int().positive().optional(),
      target_account_ids: z.array(z.string()).optional().default([]),
    })
    .refine(
      (data) => Boolean(data.body_text || (data.media_urls && data.media_urls.length > 0)),
      { message: "Post must have body text or media", path: ["body_text"] },
    )
    .refine(
      (data) => data.status !== "scheduled" || Boolean(data.scheduled_at),
      { message: "scheduled_at is required when status is scheduled", path: ["scheduled_at"] },
    ),
});

/**
 * Schema for PUT /:id — all body fields optional, same conditional on scheduled_at.
 */
exports.updatePostSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid post id format"),
  }),
  body: z
    .object({
      title: z.string().max(500).optional(),
      body_text: z.string().optional(),
      media_urls: z.array(z.string()).optional(),
      thumbnail_url: z.string().optional().nullable(),
      hashtags: z.array(z.string()).optional(),
      status: z.enum(POST_STATUSES).optional(),
      scheduled_at: z.string().optional().nullable(),
      content_type_id: z.number().int().positive().optional(),
      target_account_ids: z.array(z.string()).optional(),
    })
    .refine(
      (data) => data.status !== "scheduled" || Boolean(data.scheduled_at),
      { message: "scheduled_at is required when status is scheduled", path: ["scheduled_at"] },
    ),
});
