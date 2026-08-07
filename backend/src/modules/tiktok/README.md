# TikTok Integration Module

This module handles integration with the TikTok Content Posting API / Login Kit v2 (`https://open.tiktokapis.com/v2/`).

## Capabilities
- **OAuth 2.0 PKCE Flow**: Generates authorization URL, exchanges auth codes for tokens.
- **Account Linking & Persistence**: Links connected accounts (`social_accounts`) and stores tokens (`oauth_tokens`).
- **Video Publishing**: Publishes video posts to TikTok via PULL_FROM_URL or Direct Upload endpoints.
- **Token Refresh**: Automatic & manual OAuth access token refresh.
- **Scheduled-Posts Integration**: Native worker dispatch support for scheduled TikTok videos.

## Environment Variables
The following environment variables are required for TikTok API access:
```env
TIKTOK_CLIENT_KEY=your_tiktok_client_key
TIKTOK_CLIENT_SECRET=your_tiktok_client_secret
TIKTOK_REDIRECT_URI=http://localhost:5000/api/auth/tiktok/callback
```
*Note: Safe test defaults are set in `backend/src/test-utils/env.js` for unit testing.*

## Routes
- `GET /api/auth/tiktok/oauth` - Initiates OAuth 2.0 PKCE redirect to TikTok.
- `GET /api/auth/tiktok/callback` - OAuth callback endpoint; saves user profile & tokens.
- `POST /api/auth/tiktok/post` - Publishes a video to TikTok (validated with Joi schema).
- `POST /api/auth/tiktok/refresh` - Refreshes expired TikTok access tokens.

## Database Tables Touched
- `platforms` (`code: 'tiktok'`)
- `social_accounts`
- `oauth_tokens`
