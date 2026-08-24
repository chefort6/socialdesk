const tiktokService = require("./tiktok.service");
const dbService = require("../social-connections/social-connections.service");
const { successResponse, errorResponse } = require("../../shared/utils/response.util");

const pkceCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
});

/**
 * Redirects user to TikTok OAuth consent page.
 */
exports.redirectToTikTok = (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return errorResponse(res, "userId is required", 400);
  }

  const { codeVerifier, codeChallenge } = tiktokService.generatePKCE();

  res.cookie("tiktok_code_verifier", codeVerifier, {
    ...pkceCookieOptions(),
    maxAge: 10 * 60 * 1000,
  });

  const url = tiktokService.getTikTokAuthUrl({
    userId,
    codeChallenge,
    state: userId,
  });

  res.redirect(url);
};

/**
 * Handles TikTok OAuth callback.
 */
exports.handleTikTokCallback = async (req, res) => {
  try {
    const { code, state: userId, code_verifier: queryVerifier } = req.query;
    const cookieVerifier = req.cookies?.tiktok_code_verifier;
    const codeVerifier = queryVerifier || cookieVerifier;

    if (!code) {
      return errorResponse(res, "Authorization code missing", 400);
    }
    if (!userId) {
      return errorResponse(res, "userId (state) missing", 400);
    }

    const tokenData = await tiktokService.handleTikTokOAuth({
      code,
      codeVerifier,
    });

    const accessToken = tokenData.access_token || tokenData.data?.access_token;
    const refreshToken = tokenData.refresh_token || tokenData.data?.refresh_token || null;
    const expiresIn = tokenData.expires_in || tokenData.data?.expires_in;

    const profile = await tiktokService.getUserProfile(accessToken);

    const platformId = await dbService.getPlatformId("tiktok");

    const externalId = profile.open_id || profile.union_id;
    const username = profile.username || profile.display_name || "tiktok_user";
    const displayName = profile.display_name || profile.username || "TikTok User";

    const account = await dbService.upsertSocialAccount({
      userId,
      platformId,
      externalId,
      username,
      displayName,
      profileUrl: `https://www.tiktok.com/@${username}`,
      avatarUrl: profile.avatar_url,
      metadata: profile,
    });

    const expiresAt = expiresIn
      ? new Date(Date.now() + expiresIn * 1000).toISOString()
      : null;

    await dbService.upsertOAuthToken({
      socialAccountId: account.id,
      accessToken,
      refreshToken,
      tokenType: tokenData.token_type || "Bearer",
      expiresAt,
      scope: tokenData.scope || "user.info.basic,video.upload,video.publish",
    });

    res.clearCookie("tiktok_code_verifier", pkceCookieOptions());

    return successResponse(res, {
      message: "TikTok account linked successfully",
      account,
    });
  } catch (err) {
    return errorResponse(res, err.response?.data || err.message, 500);
  }
};

/**
 * Endpoint to post a video to TikTok.
 */
exports.postVideo = async (req, res) => {
  try {
    const {
      socialAccountId,
      videoUrl,
      title,
      privacyLevel,
      disableComment,
      disableDuet,
      disableStitch,
    } = req.body;

    const result = await tiktokService.publishTikTokVideo({
      socialAccountId,
      videoUrl,
      title,
      privacyLevel,
      disableComment,
      disableDuet,
      disableStitch,
    });

    return successResponse(res, { result });
  } catch (err) {
    return errorResponse(res, err.response?.data || err.message, 500);
  }
};

/**
 * Endpoint to refresh TikTok OAuth access token.
 */
exports.refreshToken = async (req, res) => {
  try {
    const { socialAccountId } = req.body;

    const updatedToken = await tiktokService.refreshOAuthToken(socialAccountId);

    return successResponse(res, { updatedToken });
  } catch (err) {
    return errorResponse(res, err.response?.data || err.message, 500);
  }
};
