const express = require("express");
const router = express.Router();
const accountsController = require("./accounts.controller");
const {
  authenticate,
  requireAdmin,
} = require("../../shared/middleware/auth.middleware");
const { validate } = require("../../shared/middleware/validate.middleware");
const {
  createAccountSchema,
  updateAccountSchema,
  accountIdSchema,
} = require("./accounts.schema");

/** Every route is scoped to the authenticated user's own connected accounts. */
router.use(authenticate);

const allowManualAccountCreation = (_req, res, next) => {
  if (
    process.env.NODE_ENV === "production" ||
    process.env.MANUAL_ACCOUNT_CREATION_ENABLED !== "true"
  ) {
    return res.status(403).json({ error: "Manual account creation is disabled" });
  }

  next();
};

router.get("/", accountsController.listAccounts);
router.post(
  "/",
  requireAdmin,
  allowManualAccountCreation,
  validate(createAccountSchema),
  accountsController.createAccount,
);
router.patch("/:id", validate(updateAccountSchema), accountsController.updateAccount);
router.delete("/:id", validate(accountIdSchema), accountsController.disconnectAccount);

module.exports = router;
