# API Rate Limiting

This document explains how AdaptFit protects expensive and abuse-prone API
endpoints without blocking normal user behavior — especially users who need
multiple attempts to complete onboarding.

Rate limiting is implemented in three complementary layers:

1. **HTTP rate limits** — cap how often a client can hit specific routes.
2. **Job deduplication** — prevent the same user from stacking concurrent AI jobs.
3. **Worker concurrency** — cap how many background jobs run in parallel per worker process.

All HTTP counters are stored in **Redis** (the same instance already used by
BullMQ), so limits apply consistently across multiple API server instances.

## Design Goals

### Protect expensive integrations

The highest-cost calls in AdaptFit are:

- **OpenRouter** — used by onboarding validation and plan generation workers.
- **ExerciseDB (RapidAPI)** — used when loading exercise details and when saving
  generated plans.
- **Stripe** — used by billing checkout, portal, and sync routes.
- **Google OAuth** — used by login start and callback routes.

Rate limits focus on routes that either enqueue AI work or call these services
directly.

### Preserve UX for legitimate retries

Onboarding is a long form. Users often submit several times while fixing
validation errors or AI-flagged fields. Limits are intentionally **loose** on
`POST /onboarding` and kept **separate** from plan regeneration limits so form
retries do not consume plan-generation quota.

### Block abnormal traffic, not normal traffic

The system is designed to stop sustained abuse (scripted floods, repeated
OpenRouter enqueue spam) rather than occasional human mistakes. A user who
submits onboarding 10 times in a session should remain well under the cap.

### Fail safely at the edge

HTTP rate limits run **before** route handlers and **before** BullMQ jobs are
enqueued. Expensive work should not start if the client is already over limit.

## Architecture Overview

```text
HTTP request
    │
    ▼
isAuthenticated (where required)
    │
    ▼
hasActiveSubscription (where required)
    │
    ▼
rate limit middleware  ──► 429 if over limit
    │
    ▼
route handler
    │
    ├─► direct external API call (e.g. GET /exercises/:id)
    │
    └─► enqueueUserJob()  ──► 409 if user already has active job
            │
            ▼
        BullMQ queue (Redis)
            │
            ▼
        Worker (concurrency: 50)
            │
            ▼
        OpenRouter / ExerciseDB / DB
```

## Layer 1 — HTTP Rate Limits

**Implementation:** `adaptfit-api/middleware/rate_limit.js`

Uses [`express-rate-limit`](https://github.com/express-rate-limit/express-rate-limit)
with [`rate-limit-redis`](https://github.com/express-rate-limit/rate-limit-redis)
for distributed counting.

Each limiter is a separate Express middleware with its own Redis key prefix.
Counters use a **rolling window**: when the window expires, the count resets.

### Current limits

| Middleware | Route(s) | Limit | Window | Key |
|------------|----------|-------|--------|-----|
| `onboardingRateLimit` | `POST /onboarding` | 50 | 30 min | user ID |
| `planGenerationRateLimit` | `POST /plans` | 15 | 30 min | user ID |
| `exerciseLookupRateLimit` | `GET /exercises/:exerciseDbId` | 120 | 1 min | user ID |
| `authRateLimit` | `GET /auth/google/start`, `GET /auth/google/callback` | 60 | 30 min | IP address |
| `billingRateLimit` | `POST /billing/sync`, `/checkout-session`, `/portal-session` | 40 | 30 min | user ID |

### Middleware order

Rate limiters run **after** authentication (and subscription checks where
applicable) so they can key by `req.user.id`:

```text
POST /onboarding
  → isAuthenticated
  → hasActiveSubscription
  → onboardingRateLimit
  → handler
```

Auth routes have no logged-in user yet, so `authRateLimit` keys by IP.

### Response when limited

Clients receive **HTTP 429** with:

```json
{
  "error": "Too many requests. Please wait a moment and try again."
}
```

Standard rate-limit headers are also sent (`RateLimit-Limit`,
`RateLimit-Remaining`, `RateLimit-Reset`).

### Redis key layout

Each limiter writes counters under a distinct prefix, for example:

```text
rl:onboarding:<userId>
rl:plan-gen:<userId>
rl:exercise-lookup:<userId>
rl:auth:<ip>
rl:billing:<userId>
```

Separate prefixes mean onboarding and plan generation quotas are independent.

### Production proxy support

In production, `app.js` sets `trust proxy` so Express reads the real client IP
from `X-Forwarded-For` when the API sits behind a reverse proxy. This keeps
IP-based auth limits accurate.

```js
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}
```

### Routes intentionally not rate limited

These endpoints are excluded because they are low-cost or required for normal
in-progress UX:

- `GET /api/health`
- `GET /auth/me`, `POST /auth/logout`
- `GET /plans` (read latest plan)
- `GET /onboarding/status/:jobId/stream` (SSE progress)
- `GET /plans/status/:jobId/stream` (SSE progress)
- `POST /stripe/webhook` (Stripe signature verification)

Internal server-side calls (for example, auto-enqueueing plan generation after
onboarding completes) bypass HTTP rate limits because they never go through the
HTTP middleware stack.

## Layer 2 — Job Deduplication

**Implementation:** `adaptfit-api/services/tasks.js` → `enqueueUserJob()`

`POST /onboarding` and `POST /plans` do not call OpenRouter directly. They
enqueue BullMQ jobs. Deduplication prevents a single user from stacking multiple
concurrent jobs of the same type.

### How it works

Each user gets a stable BullMQ job ID per queue:

```text
validate-onboarding-<userId>
generate-plan-<userId>
```

Before enqueueing:

1. Look up the existing job by ID.
2. If it exists and is `waiting`, `active`, `delayed`, or `paused`, reject with **409**.
3. If the previous job completed or failed (and was cleaned up), allow a new job.

### Response when deduplicated

```json
{
  "error": "A request is already in progress. Please wait for it to finish.",
  "jobId": "validate-onboarding-abc123",
  "statusUrl": "/onboarding/status/validate-onboarding-abc123/stream"
}
```

The client can reconnect to the existing SSE stream instead of starting duplicate
AI work. This protects against double-clicks and rapid resubmits while a job is
still running.

### Job cleanup

Completed jobs are removed immediately (`removeOnComplete: true`). Failed jobs
are kept for up to one hour (`removeOnFail: { age: 3600 }`) for debugging, then
removed so the user can retry.

## Layer 3 — Worker Concurrency

**Implementation:**

- `adaptfit-api/workers/verify-onboarding-worker.js`
- `adaptfit-api/workers/generate-plan-worker.js`

Both workers run with `concurrency: 50`.

BullMQ `concurrency` controls how many jobs **one worker process** handles in
parallel. It is **not** per-user:

| Setting | Effect |
|---------|--------|
| `concurrency: 50` on one process | Up to 50 jobs from different users run at once |
| Two worker processes on same queue | Up to 100 jobs in parallel (50 each) |
| Separate onboarding vs plan workers | Up to 50 onboarding + 50 plan jobs can run simultaneously |

If more jobs arrive than concurrency allows, they wait in the Redis queue. They
are not rejected.

This layer is a **cost and capacity throttle** on OpenRouter, not an abuse
control. Per-user abuse is handled by HTTP limits and job deduplication.

## End-to-End Example: Onboarding Submit

```text
1. User POSTs /onboarding with profile JSON.
2. isAuthenticated — must have valid session.
3. hasActiveSubscription — must have active subscription.
4. onboardingRateLimit — must be under 50 requests / 30 min.
5. validateProfile() — local Zod validation (no AI yet).
6. enqueueUserJob("validate-onboarding", userId, data)
     - If user already has active validation job → 409 + existing statusUrl.
     - Else → job queued in Redis.
7. API returns 202 { jobId, statusUrl }.
8. verify-onboarding-worker picks up job (up to 5 concurrent across users).
9. Worker calls OpenRouter for AI field validation.
10. Client listens on GET /onboarding/status/:jobId/stream for progress.
11. On success, server saves profile and internally enqueues plan generation.
```

Plan generation follows the same pattern on `POST /plans` and the
`generate-plan` queue.

## Why Three Layers Instead of One

A single global rate limit would not cover all abuse patterns:

| Threat | Layer that addresses it |
|--------|-------------------------|
| Scripted flood of HTTP requests | HTTP rate limits |
| Double-submit / rapid resubmit while job runs | Job deduplication |
| Many users hitting OpenRouter at once | Worker concurrency |
| One user enqueueing many jobs sequentially | HTTP rate limits + subscription gate |
| Auth endpoint brute force / OAuth spam | IP-based auth rate limit |
| Exercise detail scraping | Per-user exercise lookup limit |

Each layer operates at a different stage of the request lifecycle.

## Key Files

| File | Purpose |
|------|---------|
| `adaptfit-api/middleware/rate_limit.js` | HTTP limiter definitions |
| `adaptfit-api/services/redis.js` | Shared Redis client for rate-limit store |
| `adaptfit-api/services/tasks.js` | `enqueueUserJob()` deduplication |
| `adaptfit-api/routers/onboarding_router.js` | Onboarding limit + enqueue |
| `adaptfit-api/routers/plans_router.js` | Plan limit + enqueue |
| `adaptfit-api/routers/exercises_router.js` | Exercise lookup limit |
| `adaptfit-api/routers/auth_router.js` | Auth IP limit |
| `adaptfit-api/routers/billing_router.js` | Billing limit |
| `adaptfit-api/app.js` | Production `trust proxy` |
| `adaptfit-api/workers/verify-onboarding-worker.js` | Onboarding worker concurrency |
| `adaptfit-api/workers/generate-plan-worker.js` | Plan worker concurrency |

## Tuning Limits

Limits live in `middleware/rate_limit.js` as `windowMs` and `max` per limiter.
When adjusting:

- **Increase `max`** or ** lengthen `windowMs`** to be more permissive.
- **Decrease `max`** or ** shorten `windowMs`** to tighten abuse protection.
- Keep onboarding limits higher than plan generation limits if form retries
  remain a UX priority.
- Keep limiter prefixes separate so one route group does not consume another's
  quota.

Worker concurrency is configured independently in each worker file. Raising it
improves throughput for concurrent users but increases peak OpenRouter usage.

## Dependencies

Added to `adaptfit-api/package.json`:

- `express-rate-limit` — HTTP middleware
- `rate-limit-redis` — Redis-backed store for distributed counting

Redis connection settings reuse `REDIS_HOST` and `REDIS_PORT` from
`adaptfit-api/config/env/storage.js` (same as BullMQ).
