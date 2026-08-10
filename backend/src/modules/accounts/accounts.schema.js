const { z } = require("zod");

/** POST /api/accounts — development-only admin mock account creation. */
exports.createAccountSchema = z.object({
  body: z.object({
    platformCode: z.string().min(1, "platformCode is required"),
    external_id: z.string().min(1, "external_id is required"),
    username: z.string().optional(),
    display_name: z.string().optional(),
  }),
});

/** PATCH /api/accounts/:id — account status / detail updates. */
exports.updateAccountSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid account id"),
  }),
  body: z
    .object({
      is_active: z.boolean().optional(),
      username: z.string().optional(),
      display_name: z.string().optional(),
    })
    .refine(
      (data) =>
        data.is_active !== undefined ||
        data.username !== undefined ||
        data.display_name !== undefined,
      {
        message:
          "At least one field (is_active, username, display_name) is required",
      },
    ),
});

/** DELETE /api/accounts/:id — soft disconnect. */
exports.accountIdSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid account id"),
  }),
});
