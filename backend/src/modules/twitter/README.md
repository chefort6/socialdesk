# Twitter / X Module

This module handles OAuth 2.0 PKCE authentication, tweet posting, token persistence, and automatic token refresh for X (Twitter).

## Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/auth/twitter/oauth?userId=<uuid>` | Redirects user to Twitter OAuth 2.0 authorization screen |
| `GET` | `/api/auth/twitter/callback?code=...&state=...` | Handles OAuth 2.0 callback, exchanges authorization code for tokens, retrieves user profile, and persists account to DB |
| `POST` | `/api/auth/twitter/post` | Directly posts a tweet (`accessToken`, `text`, optional `mediaIds`) |
| `POST` | `/api/auth/twitter/refresh` | Refreshes OAuth token for a given `socialAccountId` |

## Environment Variables

Ensure the following variables are defined in `backend/.env`:

```env
TWITTER_CLIENT_ID=your_twitter_client_id
TWITTER_CLIENT_SECRET=your_twitter_client_secret
TWITTER_REDIRECT_URI=http://localhost:5000/api/auth/twitter/callback
```
