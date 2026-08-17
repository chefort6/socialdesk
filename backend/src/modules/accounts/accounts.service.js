const accountsRepository = require("./accounts.repository");
const socialConnectionsRepository = require("../social-connections/social-connections.repository");
const notificationsService = require("../notifications/notifications.service");
const scheduledPostsQueue = require("../scheduled-posts/scheduled-posts.queue");

exports.listAccounts = async (userId) => {
  const { accounts, error } = await accountsRepository.findActiveByUser(userId);
  if (error) throw new Error(error.message);
  return accounts;
};

/**
 * Creates a mock account for the development-only admin route. Resolves the
 * platform code to its internal id first; getPlatformId throws for an unknown
 * code, which the controller surfaces as a 400.
 */
exports.createAccount = async (
  userId,
  { platformCode, externalId, username, displayName },
) => {
  const platformId = await socialConnectionsRepository.getPlatformId(platformCode);

  const { account, error } = await accountsRepository.insertAccount({
    userId,
    platformId,
    externalId,
    username,
    displayName,
  });
  if (error) throw new Error(error.message);

  // Emit account-connected notification (fire-and-forget)
  await notificationsService.emitAccountConnected({
    userId,
    platform: platformCode,
    username: username || displayName,
  });

  return account;
};

/**
 * Updates status / details on an account the user owns. Returns null when no
 * matching (owned) account exists, which the controller maps to 404.
 */
exports.updateAccount = async (userId, id, fields) => {
  const { account, error } = await accountsRepository.updateForUser(
    id,
    userId,
    fields,
  );
  if (error) throw new Error(error.message);
  return account;
};

/**
 * Soft-disconnects an account (flips is_active to false) without deleting the
 * row or its OAuth token, so it can be reconnected later. Returns null when no
 * matching (owned) account exists.
 */
exports.disconnectAccount = async (userId, id) => {
  const { account, error } = await accountsRepository.updateForUser(id, userId, {
    is_active: false,
  });
  if (error) throw new Error(error.message);

  // Clean up pending scheduled jobs for this account so they don't fail later
  try {
    await scheduledPostsQueue.cancelPostTargetsByAccountId({ accountId: id });
  } catch (cleanupError) {
    console.error("Failed to cleanup scheduled posts for disconnected account:", cleanupError);
    // Non-blocking: we still disconnected the account successfully
  }

  // Emit account-disconnected notification (fire-and-forget)
  if (account) {
    await notificationsService.emitAccountDisconnected({
      userId,
      platform: account.platforms?.code || account.platform_code,
      username: account.username || account.display_name,
    });
  }

  return account;
};
