# Accounts Module

## Purpose

The Accounts module exposes the HTTP API for a signed-in user to manage their own
connected social accounts: list them, update their status, and soft-disconnect them.
It also provides an explicitly enabled, non-production admin tool for creating mock
accounts. It moves this logic off the Next.js `frontend/app/api/accounts` route (which
talked to Supabase with the service-role key and an unverified JWT) and onto the
Express backend, where the JWT is verified and every query is scoped to the caller.

Real accounts are still connected by the provider OAuth callbacks through the
[Social Connections](../social-connections/README.md) module; this module manages the
resulting records.

## Routes

All routes are mounted at `/api/accounts` and require a valid session
(`authenticate`). `GET`, `PATCH`, and `DELETE` are user-scoped: every query is filtered
by `req.user.id`, so a user only sees or mutates their own accounts. `POST` also
requires an admin session and `MANUAL_ACCOUNT_CREATION_ENABLED=true`, and is always
blocked in production.

| Method & Path             | Purpose                                                                 |
| ------------------------- | ----------------------------------------------------------------------- |
| `GET /api/accounts`       | List the caller's active accounts, newest first, with nested `platforms`. |
| `POST /api/accounts`      | Create a mock account as an enabled non-production admin. Returns `201`. |
| `PATCH /api/accounts/:id` | Update status/details (`is_active`, `username`, `display_name`).        |
| `DELETE /api/accounts/:id`| Soft-disconnect: sets `is_active = false`. The row and OAuth token are kept. |

`PATCH` and `DELETE` return `404` when no account with that id belongs to the caller.
Request bodies are validated with Zod (`accounts.schema.js`); responses use the shared
`{ success, data }` envelope.

### Request / response shapes

- `POST` body: `{ platformCode, external_id, username?, display_name? }`.
- `PATCH` body: at least one of `{ is_active, username, display_name }`.
- Account object (in `data`): `id, username, display_name, profile_url, avatar_url,
  is_active, connected_at, platforms { id, code, name }`.

## Data Ownership

This module reads and writes the `social_accounts` table (owned schema-wise by
[Social Connections](../social-connections/README.md)). It reuses
`socialConnectionsRepository.getPlatformId(platformCode)` to resolve a platform `code`
to its id on create, rather than importing the Supabase client for that lookup. It does
not touch `oauth_tokens` — a soft disconnect intentionally leaves the token in place so
the account can be reconnected later.

## Module Files

- `accounts.routes.js` — router; applies `authenticate` and `validate(...)`.
- `accounts.controller.js` — thin HTTP layer; maps not-found to `404`, unknown platform to `400`.
- `accounts.service.js` — business logic; resolves platform ids and unwraps repository errors.
- `accounts.repository.js` — `social_accounts` queries (`findActiveByUser`, `insertAccount`, `updateForUser`).
- `accounts.schema.js` — Zod schemas for create / update / id-param.
- `accounts.routes.test.js` — `node --test` + `supertest` coverage.

## Frontend Integration

The Next.js route `frontend/app/api/accounts/route.ts` is now a thin proxy: it forwards
the `auth-token` cookie to the backend as a `Bearer` header and unwraps the envelope so
the accounts and analytics pages keep receiving the same shapes as before (a bare array
from `GET`, a single object from `POST`, `{ success: true }` from `DELETE`).

Set `BACKEND_API_URL` or `NEXT_PUBLIC_BACKEND_API_URL` for the frontend server if the
backend is not running at `http://localhost:5000/api`.

## Dependencies

- Middleware: `src/shared/middleware/auth.middleware.js`, `validate.middleware.js`
- Utils: `src/shared/utils/response.util.js`
- Infrastructure: `src/infrastructure/database/supabaseClient.js`
- Environment variables: `SUPABASE_URL`, `SUPABASE_KEY`, `JWT_SECRET`,
  `MANUAL_ACCOUNT_CREATION_ENABLED`

## Known Limits

Account "status" is the `is_active` boolean only — there is no richer status enum in the
schema. Development-only mock accounts have no `oauth_tokens` row and cannot publish.
Cross-user administration (viewing another user's accounts) is out of scope here and
belongs to the `account-admin` module.
