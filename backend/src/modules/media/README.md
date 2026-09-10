# Media Module

## Purpose

The Media module owns Cloudinary configuration and shared upload middleware. Provider modules use it for image and video uploads.

## Public Module API

- `cloudinary.client.js` exports the configured Cloudinary v2 client.
- `upload.middleware.js` exports multer memory storage middleware.
- `media.service.js` exposes a shared `uploadToCloudinary(file, options)` helper for future provider cleanup.
- `media.routes.js` + `media.controller.js` expose the authenticated generic endpoints (`POST /api/media`, `DELETE /api/media`), mounted in `app.js`.
- `media.service.js` also exports the generic-upload constants: `MEDIA_NAMESPACE` (`user_media`), `MAX_MEDIA_BYTES` (10 MB), `ALLOWED_PURPOSES` (`general`, `composer`, `thumbnail`, `avatar`).

## Upload Contracts

Current public multipart field names are preserved:

- Facebook direct photo: `source`
- Facebook scheduled photo: `source`
- Instagram image post: `source`
- Instagram Reel post: `source`
- Pinterest pin image: `file`

Current Cloudinary folders are preserved:

- `fb_posts`
- `social_posts`
- `pinterest_posts`
- `user_avatars/{userId}` (avatar module, deterministic public id)
- `user_media/{userId}/{purpose}/...` (generic media module, see below)

## Generic Media Endpoints (BE-035)

Authenticated reusable uploads for composer media, thumbnails, avatars, and
future provider-specific reuse.

### `POST /api/media`

- Auth: required (`authenticate`; cookie `auth-token` or `Authorization: Bearer <token>`).
- Body: `multipart/form-data` with file field **`file`** and optional text field **`purpose`** (`general` default; allowed: `general`, `composer`, `thumbnail`, `avatar`).
- Supported media: common image formats (JPEG, PNG, GIF, WebP, BMP, TIFF, AVIF/HEIF) and video containers (MP4/QuickTime, WebM/Matroska, AVI, MPEG, Ogg). Both the declared MIME category and the file signature are checked; spoofed or mismatched content is rejected with `400`.
- Upload limit: **10 MB**. Rationale: multer uses `memoryStorage()`, so the whole file sits in RAM; 10 MB is a conservative documented cap covering images + short clips. Multer `LIMIT_FILE_SIZE` errors are translated to the standard JSON `400` envelope.
- Missing file or invalid `purpose` returns `400`.
- Uploads go through `mediaService.uploadToCloudinary(file, { folder, resource_type })` — the controller never calls Cloudinary directly. Resource type is derived from the MIME type (`video/*` → `video`, else `image`).
- Storage namespace is backend-controlled: `user_media/{authenticatedUserId}/{purpose}/...`. Clients cannot supply folder paths.
- Success (`200`, `successResponse`): `{ url, secureUrl, publicId, resourceType }`.

### `DELETE /api/media`

- Auth: required (`authenticate`).
- Body (JSON) or query: **`publicId`** (required), optional `resourceType` / `resource_type` (`image` default; allowed: `image`, `video`).
- Deletes via `mediaService.destroyFromCloudinary(publicId, { resource_type, invalidate: true })`.
- Ownership: the public id must start with `user_media/{authenticatedUserId}/`. Anything else (including another user's `user_media/{otherId}/...`, legacy provider folders, `..` traversal) returns **`403`** without touching Cloudinary. Missing `publicId` returns `400`; invalid `resourceType` returns `400`.
- Success (`200`, `successResponse`): `{ publicId, result }` where `result` is Cloudinary's `result` (`ok`, `not found`, ...).

## Dependencies

- Libraries: `cloudinary`, `multer`
- Environment variables: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`

## Known Limits

Some provider services still contain local upload helper functions to preserve behavior exactly during the structural migration. They can be consolidated onto `media.service.js` in a later cleanup pass.
