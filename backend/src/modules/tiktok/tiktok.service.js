const crypto = require("crypto");
const axios = require("axios");
const dbService = require("../social-connections/social-connections.service");

const TIKTOK_OAUTH_AUTH_URL = "https://www.tiktok.com/v2/auth/authorize/";
const TIKTOK_OAUTH_TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";
const TIKTOK_USER_INFO_URL = "https://open.tiktokapis.com/v2/user/info/";
const TIKTOK_PUBLISH_INIT_URL = "https://open.tiktokapis.com/v2/post/publish/video/init/";

const SCOPES = ["user.info.basic", "video.upload", "video.publish"];

/**
 * Generates PKCE code verifier and S256 code challenge.
 */
exports.generatePKCE = () => {
  const codeVerifier = crypto.randomBytes(32).toString("base64url");
  const codeChallenge = crypto
    .createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");

  return { codeVerifier, codeChallenge };
};

/**
 * Constructs TikTok OAuth 2.0 PKCE authorization URL.
 */
exports.getTikTokAuthUrl = ({ userId, codeChallenge, state }) => {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const redirectUri = process.env.TIKTOK_REDIRECT_URI;

  if (!clientKey || !redirectUri) {
    throw new Error("TIKTOK_CLIENT_KEY or TIKTOK_REDIRECT_URI is not set in environment");
  }

  const params = new URLSearchParams({
    client_key: clientKey,
    response_type: "code",
    scope: SCOPES.join(","),
    redirect_uri: redirectUri,
    state: state || userId || "",
    code_challenge: codeChallenge || "",
    code_challenge_method: "S256",
  });

  return `${TIKTOK_OAUTH_AUTH_URL}?${params.toString()}`;
};

/**
 * Exchanges authorization code for TikTok OAuth access and refresh tokens.
 */
exports.handleTikTokOAuth = async ({ code, codeVerifier }) => {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  const redirectUri = process.env.TIKTOK_REDIRECT_URI;

  if (!clientKey || !clientSecret || !redirectUri) {
    throw new Error("Missing TikTok API credentials in environment");
  }

  const params = new URLSearchParams({
    client_key: clientKey,
    client_secret: clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
    code_verifier: codeVerifier || "",
  });

  const response = await axios.post(TIKTOK_OAUTH_TOKEN_URL, params.toString(), {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  if (response.data?.error || response.data?.error_code) {
    throw new Error(response.data.error_description || response.data.message || "Failed to exchange TikTok authorization code");
  }

  return response.data;
};

/**
 * Fetches authenticated user profile info from TikTok Open API.
 */
exports.getUserProfile = async (accessToken) => {
  const response = await axios.get(
    `${TIKTOK_USER_INFO_URL}?fields=open_id,union_id,avatar_url,display_name,username`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  const userData = response.data?.data?.user;
  if (!userData) {
    throw new Error("Failed to retrieve TikTok user profile");
  }

  return userData;
};

/**
 * Initiates & publishes video to TikTok.
 */
exports.publishTikTokVideo = async ({
  socialAccountId,
  videoUrl,
  title = "",
  privacyLevel = "PUBLIC_TO_EVERYONE",
  disableComment = false,
  disableDuet = false,
  disableStitch = false,
}) => {
  const tokenRecord = await dbService.getOAuthTokenBySocialAccountId(socialAccountId);
  if (!tokenRecord || !tokenRecord.access_token) {
    throw new Error(`No OAuth token found for socialAccountId: ${socialAccountId}`);
  }

  const payload = {
    post_info: {
      title,
      privacy_level: privacyLevel,
      disable_comment: disableComment,
      disable_duet: disableDuet,
      disable_stitch: disableStitch,
    },
    source_info: {
      source: "PULL_FROM_URL",
      video_url: videoUrl,
    },
  };

  const response = await axios.post(TIKTOK_PUBLISH_INIT_URL, payload, {
    headers: {
      Authorization: `Bearer ${tokenRecord.access_token}`,
      "Content-Type": "application/json",
    },
  });

  if (response.data?.error?.code && response.data.error.code !== "ok") {
    throw new Error(response.data.error.message || "TikTok video publishing failed");
  }

  return response.data;
};

/**
 * Helper method for scheduled-post worker dispatch.
 */
exports.publishScheduledTikTokVideo = async ({ socialAccountId, videoUrl, title }) => {
  return exports.publishTikTokVideo({
    socialAccountId,
    videoUrl,
    title,
  });
};

/**
 * Refreshes an expired TikTok OAuth access token using refresh_token.
 */
exports.refreshOAuthToken = async (socialAccountId) => {
  const tokenRecord = await dbService.getOAuthTokenBySocialAccountId(socialAccountId);
  if (!tokenRecord || !tokenRecord.refresh_token) {
    throw new Error(`No refresh token available for socialAccountId: ${socialAccountId}`);
  }

  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;

  if (!clientKey || !clientSecret) {
    throw new Error("TIKTOK_CLIENT_KEY or TIKTOK_CLIENT_SECRET is missing");
  }

  const params = new URLSearchParams({
    client_key: clientKey,
    client_secret: clientSecret,
    grant_type: "refresh_token",
    refresh_token: tokenRecord.refresh_token,
  });

  const response = await axios.post(TIKTOK_OAUTH_TOKEN_URL, params.toString(), {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  const data = response.data;
  if (data?.error || data?.error_code) {
    throw new Error(data.error_description || data.message || "TikTok token refresh failed");
  }

  const accessToken = data.access_token || data.data?.access_token;
  const refreshToken = data.refresh_token || data.data?.refresh_token || tokenRecord.refresh_token;
  const expiresIn = data.expires_in || data.data?.expires_in || 86400;

  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

  const updatedToken = await dbService.upsertOAuthToken({
    socialAccountId,
    accessToken,
    refreshToken,
    tokenType: "Bearer",
    expiresAt,
    scope: SCOPES.join(","),
  });

  return updatedToken;
};
