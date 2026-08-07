const crypto = require("crypto");
const axios = require("axios");
const dbService = require("../social-connections/social-connections.service");

const TWITTER_OAUTH2_AUTH_URL = "https://twitter.com/i/oauth2/authorize";
const TWITTER_OAUTH2_TOKEN_URL = "https://api.twitter.com/2/oauth2/token";
const TWITTER_API_V2_BASE = "https://api.twitter.com/2";

const SCOPES = ["tweet.read", "tweet.write", "users.read", "offline.access"];

/**
 * Generates a PKCE code verifier and S256 code challenge.
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
 * Constructs the Twitter OAuth 2.0 PKCE authorization URL.
 */
exports.getTwitterAuthUrl = ({ userId, codeChallenge, state }) => {
  const clientId = process.env.TWITTER_CLIENT_ID;
  const redirectUri = process.env.TWITTER_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    throw new Error("TWITTER_CLIENT_ID or TWITTER_REDIRECT_URI is not set in environment");
  }

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: SCOPES.join(" "),
    state: state || userId || "",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  return `${TWITTER_OAUTH2_AUTH_URL}?${params.toString()}`;
};

/**
 * Helper to produce Basic Auth credentials for Twitter OAuth 2.0 endpoints.
 */
const getBasicAuthHeader = () => {
  const clientId = process.env.TWITTER_CLIENT_ID;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET || "";
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  return `Basic ${credentials}`;
};

/**
 * Exchanges authorization code for OAuth 2.0 access & refresh tokens.
 */
exports.handleTwitterOAuth = async ({ code, codeVerifier }) => {
  const redirectUri = process.env.TWITTER_REDIRECT_URI;
  const clientId = process.env.TWITTER_CLIENT_ID;

  const params = new URLSearchParams({
    code,
    grant_type: "authorization_code",
    client_id: clientId,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
  });

  const response = await axios.post(TWITTER_OAUTH2_TOKEN_URL, params.toString(), {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: getBasicAuthHeader(),
    },
  });

  return response.data;
};

/**
 * Fetches authenticated user's Twitter profile information.
 */
exports.getUserProfile = async (accessToken) => {
  const response = await axios.get(
    `${TWITTER_API_V2_BASE}/users/me?user.fields=profile_image_url,username,name`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  const userData = response.data?.data;
  if (!userData) {
    throw new Error("Failed to retrieve Twitter user profile");
  }

  return {
    id: userData.id,
    name: userData.name,
    username: userData.username,
    profileImageUrl: userData.profile_image_url,
  };
};

/**
 * Posts a tweet using Twitter API v2.
 */
exports.postTweet = async ({ accessToken, text, mediaIds }) => {
  const payload = { text };

  if (Array.isArray(mediaIds) && mediaIds.length > 0) {
    payload.media = { media_ids: mediaIds };
  }

  const response = await axios.post(`${TWITTER_API_V2_BASE}/tweets`, payload, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return response.data;
};

/**
 * Exchanges a refresh token for a new access token.
 */
exports.mintNewAccessToken = async (refreshToken) => {
  const clientId = process.env.TWITTER_CLIENT_ID;

  const params = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
  });

  const response = await axios.post(TWITTER_OAUTH2_TOKEN_URL, params.toString(), {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: getBasicAuthHeader(),
    },
  });

  return response.data;
};

/**
 * Refreshes and persists the OAuth token for a given social account.
 */
exports.refreshOAuthToken = async (socialAccountId) => {
  const account = await dbService.getSocialAccountWithToken(socialAccountId);
  const oauthToken = Array.isArray(account.oauth_tokens)
    ? account.oauth_tokens[0]
    : account.oauth_tokens;

  const refreshToken = oauthToken?.refresh_token;

  if (!refreshToken) {
    throw new Error("No refresh token available for this Twitter account");
  }

  const credentials = await exports.mintNewAccessToken(refreshToken);

  const expiresAt = credentials.expires_in
    ? new Date(Date.now() + credentials.expires_in * 1000).toISOString()
    : null;

  const updatedToken = await dbService.upsertOAuthToken({
    socialAccountId,
    accessToken: credentials.access_token,
    refreshToken: credentials.refresh_token || refreshToken,
    tokenType: credentials.token_type || "Bearer",
    expiresAt,
    scope: credentials.scope,
  });

  return updatedToken;
};

/**
 * Publishes a scheduled tweet for a given social account.
 * Automatically refreshes the access token if expired or about to expire.
 */
exports.publishScheduledTweet = async ({ socialAccountId, text, mediaUrl }) => {
  const account = await dbService.getSocialAccountWithToken(socialAccountId);
  const oauthToken = Array.isArray(account.oauth_tokens)
    ? account.oauth_tokens[0]
    : account.oauth_tokens;

  if (!oauthToken) {
    throw new Error(`No OAuth token found for Twitter account ${socialAccountId}`);
  }

  let accessToken = oauthToken.access_token;
  const expiresAt = oauthToken.expires_at ? new Date(oauthToken.expires_at).getTime() : 0;
  const isExpiring = Date.now() >= expiresAt - 5 * 60 * 1000;

  if (isExpiring || !accessToken) {
    const refreshed = await exports.refreshOAuthToken(socialAccountId);
    accessToken = refreshed.access_token;
  }

  let tweetText = text;
  if (mediaUrl && !tweetText.includes(mediaUrl)) {
    tweetText = `${tweetText} ${mediaUrl}`.trim();
  }

  return exports.postTweet({
    accessToken,
    text: tweetText,
  });
};
