# Scheduled Posts Module

## Purpose

The Scheduled Posts module publishes scheduled posts with BullMQ delayed jobs backed by Redis. Supabase remains the source of truth, while Redis owns the timer and retry mechanics.

## Runtime Flow

Normal scheduling is event-driven:

1. A scheduled post is saved in Supabase.
2. The post API asks the backend to schedule jobs for that post.
3. The backend adds one delayed BullMQ publish job per pending `post_targets.id`.
4. Redis holds each job until `posts.scheduled_at`.
5. The publish worker fetches the latest post and target data from Supabase.
6. The worker claims each pending target by changing it to `publishing`.
7. The worker loads the target social account and OAuth token through Social Connections.
8. The worker dispatches publishing by platform code.
9. The worker marks the target as `published` or, after the final BullMQ retry, `failed`.
10. The worker updates the parent post status when all targets are finished.

When a scheduled post is edited, the API removes the old delayed jobs for that post and adds new ones with the updated schedule. When a scheduled post is deleted or moved out of `scheduled`, the API removes pending delayed jobs.

## Recovery Scanner

A BullMQ recovery scheduler also runs on `SCHEDULED_POSTS_RECOVERY_PATTERN`, which defaults to every 15 minutes. This is not the primary scheduler. It exists to repair missed jobs, for example if Redis or the backend was unavailable when a scheduled post was created.

Each recovery run:

1. Loads due scheduled targets that are still pending.
2. Enqueues missing publish jobs with stable job ids.
3. Lets BullMQ workers publish them through the same retry-aware path.

The queue runtime starts from `server.js`. Importing `src/app.js` does not start background work.

## API Endpoints

### Post Management API
- `POST /api/scheduled-posts/:postId/jobs` - Schedules delayed jobs for one scheduled post.
- `DELETE /api/scheduled-posts/:postId/jobs` - Removes pending delayed jobs for one post.

### Operational & Admin Visibility API (Gated by `authenticate` & `requireAdmin`)
- `GET /api/scheduled-posts/queue/health` - Inspection of Redis connection, Queue counts (`waiting`, `active`, `delayed`, `completed`, `failed`), and Worker configuration.
- `GET /api/scheduled-posts/queue/failed` - Inspection of failed BullMQ jobs with error messages and stack traces (`?limit=50`).
- `GET /api/scheduled-posts/failed-targets` - Inspection of database-level `post_targets` publishing failures with parent post titles, connected accounts, and error details (`?limit=50&offset=0`).

## Environment & Redis Configuration

The queue supports two connection configuration modes:

1. **Single Connection URL**: Set `REDIS_URL` (e.g. `redis://:password@127.0.0.1:6379/0` or `rediss://...` for TLS).
2. **Individual Parameters**: Set `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `REDIS_DB`.

| Name                                     | Default                  | Purpose                                           |
| ---------------------------------------- | ------------------------ | ------------------------------------------------- |
| `REDIS_URL`                              | `redis://127.0.0.1:6379` | Redis connection string used by BullMQ.           |
| `REDIS_HOST`                             | `127.0.0.1`              | Redis server hostname (if `REDIS_URL` unset).     |
| `REDIS_PORT`                             | `6379`                   | Redis server port.                                |
| `REDIS_PASSWORD`                         | `undefined`              | Redis auth password.                              |
| `REDIS_DB`                               | `0`                      | Redis database index.                             |
| `SCHEDULED_POSTS_QUEUE_ENABLED`          | `true`                   | Set to `false` to disable the queue runtime.      |
| `SCHEDULED_POSTS_RECOVERY_ENABLED`       | `true`                   | Set to `false` to disable the recovery scanner.   |
| `SCHEDULED_POSTS_RECOVERY_PATTERN`       | `*/15 * * * *`           | Cron pattern for missed-job recovery.             |
| `SCHEDULED_POSTS_BATCH_SIZE`             | `10`                     | Maximum due targets recovered per scheduler run.  |
| `SCHEDULED_POSTS_QUEUE_ATTEMPTS`         | `3`                      | Publish job attempts before final failure.        |
| `SCHEDULED_POSTS_QUEUE_BACKOFF_DELAY_MS` | `30000`                  | Initial exponential backoff delay.                |
| `SCHEDULED_POSTS_QUEUE_CONCURRENCY`      | `5`                      | Number of publish jobs processed concurrently.    |

## Database Statuses

The worker publishes only when:

- `posts.status = scheduled`
- `posts.scheduled_at` is present
- `post_targets.status = pending`

The recovery scanner additionally requires `posts.scheduled_at <= now`.

Target status transitions:

```text
pending -> publishing -> published
pending -> publishing -> failed
```

Parent post status updates:

- `published` when all targets are published
- `failed` when all targets are terminal and at least one failed
- remains `scheduled` while any target is still pending or publishing

## Provider Rules

Supported platform codes:

- `facebook`
- `instagram`
- `pinterest`
- `youtube`
- `x` / `twitter`
- `tiktok`

Missing required provider data fails only that target and stores the reason in `post_targets.error_message`.

## Operational Troubleshooting & Recovery Playbook

1. **Redis Down or Unreachable**:
   - Inspect `/api/scheduled-posts/queue/health`. The status will show `"unhealthy"` or `"disabled"`.
   - Restore Redis daemon/service (`systemctl restart redis`).
   - The recovery scanner will automatically catch up and publish due pending targets on the next run.

2. **Publishing Failures**:
   - Query `/api/scheduled-posts/queue/failed` to inspect failed BullMQ jobs.
   - Query `/api/scheduled-posts/failed-targets` to view database target error messages (e.g. invalid OAuth token, missing media URL).
