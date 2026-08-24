const twitterService = require("./twitter.service");
const dbService = require("../social-connections/social-connections.service");
const { successResponse, errorResponse } = require("../../shared/utils/response.util");

const pkceCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
});

/**
 * Redirects user to Twitter OAuth 2.0 PKCE login page.
 */
exports.redirectToTwitter = (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return errorResponse(res, "userId is required", 400);
  }

  const { codeVerifier, codeChallenge } = twitterService.generatePKCE();

  // Store codeVerifier in a secure, httpOnly cookie for the callback step
  res.cookie("twitter_code_verifier", codeVerifier, {
    ...pkceCookieOptions(),
    maxAge: 10 * 60 * 1000, // 10 minutes
  });

  const url = twitterService.getTwitterAuthUrl({
    userId,
    codeChallenge,
    state: userId,
  });

  res.redirect(url);
};

/**
 * Handles Twitter OAuth 2.0 PKCE callback.
 */
exports.handleTwitterCallback = async (req, res) => {
  try {
    const { code, state: userId, code_verifier: queryVerifier } = req.query;
    const cookieVerifier = req.cookies?.twitter_code_verifier;
    const codeVerifier = queryVerifier || cookieVerifier;

    if (!code) {
      return errorResponse(res, "Authorization code missing", 400);
    }
    if (!userId) {
      return errorResponse(res, "userId (state) missing", 400);
    }
    if (!codeVerifier) {
      return errorResponse(res, "PKCE code verifier missing", 400);
    }

    // Exchange authorization code for tokens
    const tokenData = await twitterService.handleTwitterOAuth({
      code,
      codeVerifier,
    });

    // Fetch Twitter user profile
    const profile = await twitterService.getUserProfile(tokenData.access_token);

    // Get database platform ID for 'x'
    const platformId = await dbService.getPlatformId("x");

    // Upsert social account
    const account = await dbService.upsertSocialAccount({
      userId,
      platformId,
      externalId: profile.id,
      username: profile.username,
      displayName: profile.name,
      profileUrl: `https://x.com/${profile.username}`,
      avatarUrl: profile.profileImageUrl,
      metadata: profile,
    });

    const expiresAt = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
      : null;

    // Persist OAuth tokens
    await dbService.upsertOAuthToken({
      socialAccountId: account.id,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || null,
      tokenType: tokenData.token_type || "Bearer",
      expiresAt,
      scope: tokenData.scope,
    });

    // Clear PKCE cookie
    res.clearCookie("twitter_code_verifier", pkceCookieOptions());

    return successResponse(res, {
      message: "X (Twitter) account linked successfully",
      account,
    });
  } catch (err) {
    return errorResponse(res, err.response?.data || err.message, 500);
  }
};

/**
 * Endpoint to post a Tweet directly.
 */
exports.postTweet = async (req, res) => {
  try {
    const { accessToken, text, mediaIds } = req.body;

    const tweet = await twitterService.postTweet({
      accessToken,
      text,
      mediaIds,
    });

    return successResponse(res, { tweet });
  } catch (err) {
    return errorResponse(res, err.response?.data || err.message, 500);
  }
};

/**
 * Endpoint to manually trigger OAuth token refresh.
 */
exports.refreshToken = async (req, res) => {
  try {
    const { socialAccountId } = req.body;

    const updatedToken = await twitterService.refreshOAuthToken(socialAccountId);

    return successResponse(res, { updatedToken });
  } catch (err) {
    return errorResponse(res, err.response?.data || err.message, 500);
  }
};
