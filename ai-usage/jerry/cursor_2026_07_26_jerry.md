# API rate limiting implementation
_Exported on 7/26/2026 at 15:46:56 EDT from Cursor (3.10.20)_

---

**User**

Implement api rate limiting for our relevant api calls (such as to openrouter). We don't want to ruin the UX for regular users who are having trouble filling in the form, but we want to prevent malicious actors from abusing our endpoints by sending more requests than usual, so implement rate limiting to handle abnormal requests.

---

**Cursor**

I'll explore the API structure and find where external calls like OpenRouter are made so we can add rate limiting that protects against abuse without hurting normal form usage.


Implementing rate limiting: installing dependencies and adding middleware, job deduplication, and router updates.


Splitting onboarding and plan limits so form retries don't consume plan-generation quota.


Rate limiting is in place across the expensive and abuse-prone endpoints. It uses your existing Redis instance and is tuned so normal form retries stay smooth while abnormal traffic gets blocked.

## What was added

### Redis-backed rate limit middleware (`middleware/rate_limit.js`)
Uses `express-rate-limit` + `rate-limit-redis` with per-route limits:

| Limiter | Routes | Limit | Key |
|---------|--------|-------|-----|
| `onboardingRateLimit` | `POST /onboarding` | 20 / 15 min | user ID |
| `planGenerationRateLimit` | `POST /plans` | 5 / 15 min | user ID |
| `exerciseLookupRateLimit` | `GET /exercises/:id` | 60 / min | user ID |
| `authRateLimit` | `GET /auth/google/*` | 30 / 15 min | IP |
| `billingRateLimit` | `POST /billing/*` | 20 / 15 min | user ID |

Onboarding gets a higher cap so users fixing form errors aren’t blocked; plan regeneration is stricter since it triggers OpenRouter + ExerciseDB.

429 responses return:
```json
{ "error": "Too many requests. Please wait a moment and try again." }
```
Standard `RateLimit-*` headers are included.

### Job deduplication (`services/tasks.js`)
`enqueueUserJob()` prevents duplicate OpenRouter jobs for the same user:
- One active onboarding or plan job per user at a time
- Returns **409** with existing `jobId` and `statusUrl` if a job is already running
- Avoids double-clicks and rapid resubmits from stacking expensive AI calls

### Worker concurrency
Both OpenRouter workers run with `concurrency: 1` to cap simultaneous model calls.

### Other
- Shared Redis client in `services/redis.js`
- `trust proxy` enabled in production for correct IP-based auth limits behind a reverse proxy

## Files changed
- `middleware/rate_limit.js` (new)
- `services/redis.js` (new)
- `services/tasks.js`
- `routers/onboarding_router.js`, `plans_router.js`, `exercises_router.js`, `auth_router.js`, `billing_router.js`
- `workers/verify-onboarding-worker.js`, `generate-plan-worker.js`
- `app.js`, `package.json`

Restart the API server and workers for the changes to apply. If you want different thresholds (e.g. stricter plan limits or looser exercise lookups), say what you prefer and we can tune them.

---

**User**

Tune everything to be looser. Then explain exactly how this rate limiting works now

---

**Cursor**

I'll loosen the rate limits across all tiers, then walk through exactly how the system behaves end to end.


Limits are loosened. Here is how the system works end to end.

## Updated limits

| Route | Before | Now |
|-------|--------|-----|
| `POST /onboarding` | 20 / 15 min | **50 / 30 min** per user |
| `POST /plans` | 5 / 15 min | **15 / 30 min** per user |
| `GET /exercises/:id` | 60 / min | **120 / min** per user |
| `GET /auth/google/*` | 30 / 15 min | **60 / 30 min** per IP |
| `POST /billing/*` | 20 / 15 min | **40 / 30 min** per user |

These only kick in for sustained abnormal traffic. A user fixing the onboarding form many times should stay well under the cap.

---

## How rate limiting works (3 layers)

### Layer 1 — HTTP rate limits (first gate)

Every protected route runs middleware **after** auth (and subscription where required):

```
Request → isAuthenticated → hasActiveSubscription → rateLimit → handler
```

When a request hits e.g. `POST /onboarding`:

1. Auth runs first, so the limiter can key by `req.user.id`.
2. `onboardingRateLimit` increments a counter in **Redis** under a key like `rl:onboarding:<userId>`.
3. If the user is under 50 requests in the rolling 30-minute window, the request continues.
4. If over the limit, the handler never runs. The client gets **429** with:
   ```json
   { "error": "Too many requests. Please wait a moment and try again." }
   ```
   plus standard `RateLimit-Limit`, `RateLimit-Remaining`, and `RateLimit-Reset` headers.

**Storage:** Counters live in Redis via `rate-limit-redis`, so limits are shared if you run multiple API instances.

**Keys:**
- Authenticated routes → per **user ID** (each user has their own bucket).
- Auth routes → per **IP** (no user yet). In production, `trust proxy` is enabled so the real client IP is used behind a reverse proxy.

**Independence:** Each limiter has its own Redis prefix (`rl:onboarding:`, `rl:plan-gen:`, etc.), so onboarding retries do not consume plan-generation quota.

**What is not rate-limited:**
- `GET /onboarding/status/:jobId/stream` and `GET /plans/status/:jobId/stream` (SSE polling)
- `GET /plans`, `GET /auth/me`, webhooks, health check
- Internal plan enqueue after onboarding completes (server-side, no HTTP)

---

### Layer 2 — Job deduplication (second gate, AI routes only)

Even under the HTTP limit, `POST /onboarding` and `POST /plans` call `enqueueUserJob()` before touching OpenRouter.

For each user and queue, BullMQ uses a fixed job ID:
- `validate-onboarding-<userId>`
- `generate-plan-<userId>`

Before enqueueing:

1. Look up that job ID in Redis (BullMQ).
2. If it exists and is `waiting`, `active`, `delayed`, or `paused` → reject with **409**:
   ```json
   {
     "error": "A request is already in progress. Please wait for it to finish.",
     "jobId": "validate-onboarding-abc123",
     "statusUrl": "/onboarding/status/validate-onboarding-abc123/stream"
   }
   ```
3. If the previous job **completed** or **failed** (and was cleaned up), a new job is allowed.

So double-clicks or rapid resubmits while AI work is running do not stack OpenRouter calls. After a job finishes, the user can submit again (still subject to the HTTP limit).

---

### Layer 3 — Worker concurrency (backend cap)

OpenRouter is only called from background workers, not directly from HTTP handlers.

Both workers run with `concurrency: 1`, so at most **one** onboarding validation and **one** plan generation run globally at a time per worker process. That caps simultaneous OpenRouter spend even if many jobs are queued.

---

## End-to-end example: onboarding submit

```
User submits onboarding form
        │
        ▼
[1] isAuthenticated — must be logged in
        │
        ▼
[2] hasActiveSubscription — must have paid subscription
        │
        ▼
[3] onboardingRateLimit — under 50/30min? → continue, else 429
        │
        ▼
[4] validateProfile() — Zod schema check (local, no AI yet)
        │
        ▼
[5] enqueueUserJob() — already validating for this user? → 409, else queue job
        │
        ▼
[6] Return 202 { jobId, statusUrl }
        │
        ▼
[7] Worker picks up job (concurrency: 1) → calls OpenRouter
        │
        ▼
[8] Client listens on SSE /onboarding/status/:jobId/stream
```

A malicious actor would need to:
- Be authenticated with an active subscription
- Stay under 50 onboarding POSTs per 30 minutes
- Wait for each job to finish before enqueueing another (dedup)
- Still only get one OpenRouter call at a time globally (worker concurrency)

That blocks sustained abuse while leaving plenty of room for normal form retries.

---

**User**

In app.js, what does
@app.js (17-19) 
do?
Also, how does the concurrency: 1 field work? Does it prevent multiple different users from triggering a job at the same time, because this would be unideal

---

**Cursor**

## `trust proxy` in `app.js`

```17:19:adaptfit-api/app.js
if (process.env.NODE_ENV === "production") {
	app.set("trust proxy", 1);
}
```

In production, your API is usually behind a reverse proxy (nginx, Cloudflare, Railway, Render, etc.). The TCP connection Express sees is from that proxy, not the end user.

Without `trust proxy`, `req.ip` is the proxy’s IP. Every user would look like the same client — bad for IP-based rate limiting on `/auth/google/*`.

`app.set("trust proxy", 1)` tells Express to trust **one** proxy hop and derive the client IP from headers like `X-Forwarded-For`. Auth rate limits then apply per real user IP instead of per proxy.

It only runs in production because locally you usually hit Express directly and don’t need this.

---

## `concurrency: 1` — does it block different users?

**Short answer:** For a given worker process and queue, yes — only **one job runs at a time**, no matter which user submitted it. Other users’ jobs wait in the queue; they are not rejected.

BullMQ’s `concurrency` is **per worker instance**, not per user:

```97:107:adaptfit-api/workers/verify-onboarding-worker.js
new Worker(
	VALIDATE_ONBOARDING_QUEUE_NAME,
	async (job) => verifyOnboarding(job.data.profile, job),
	{
		connection: {
			host: REDIS_HOST,
			port: REDIS_PORT,
		},
		concurrency: 1,
	},
);
```

What that means in practice:

| Scenario | What happens |
|----------|----------------|
| User A submits onboarding | Job starts immediately |
| User B submits onboarding while A’s job runs | Job is **queued**, runs when A finishes |
| User A submits plan generation | Separate worker (`generate-plan-worker.js`), can run **in parallel** with A’s onboarding |
| You run 3 worker processes | Up to 3 onboarding jobs can run at once (1 per process) |

So `concurrency: 1` is a **global throttle on OpenRouter calls per worker process**, not a per-user lock. Per-user protection is handled separately by `enqueueUserJob()` (one active job per user per queue).

---

## Is that a problem?

It can be for UX under load:

- **2 users at once:** User B waits for User A’s OpenRouter call (~seconds to tens of seconds).
- **10 users at once:** They process one after another on that worker.

It was added mainly to cap OpenRouter spend. For normal traffic it’s usually fine; under concurrent load it can feel slow.

If you want multiple users to run in parallel without removing protection, bump concurrency to something like **3–5** per worker instead of **1**. HTTP rate limits and job deduplication still limit abuse; you’d just allow a few simultaneous OpenRouter calls instead of serializing everyone.

Want me to raise concurrency to a higher value (e.g. 3)?

---

**User**

But if there are multiple workers, it wouldnt be a major issue? I think we should set the concurrency to a higher value like 5

---

**Cursor**

Multiple worker processes each run their own concurrency pool, so raising it to 5 per worker is reasonable. Updating both OpenRouter workers now.


Updated both workers to `concurrency: 5`.

You're right that multiple workers makes this less of a concern. Here's how it scales:

- **One worker process** with `concurrency: 5` → up to 5 onboarding jobs (or 5 plan jobs) at once
- **Two worker processes** on the same queue → up to 10 concurrent jobs (5 each)
- Onboarding and plan generation are **separate workers**, so you could have up to 5 of each running at the same time on a single machine

Abuse protection is still handled by HTTP rate limits and `enqueueUserJob()` (one active job per user per queue). Concurrency only controls how many queued jobs get processed in parallel.

Restart the worker process for the change to take effect. If OpenRouter rate limits or costs become an issue at peak load, you can dial this back down.

---

**User**

Write a doc on how the rate limiting works now in /docs, explain design ideas too

---

**Cursor**

I'll read the current rate-limiting implementation and check what's already in `/docs` so the new doc matches the codebase.


Added `docs/api-rate-limiting.md`. It covers:

- **Design goals** — protect OpenRouter/ExerciseDB/Stripe/OAuth, keep onboarding retries usable, block sustained abuse
- **Three-layer architecture** — HTTP limits → job deduplication → worker concurrency, with a flow diagram
- **Current limits table** — all five limiters with windows and key strategies
- **Implementation details** — middleware order, 429/409 responses, Redis key prefixes, `trust proxy`, excluded routes
- **How `enqueueUserJob()` deduplication works** — stable job IDs, active-state checks, cleanup policy
- **Worker concurrency** — what `concurrency: 5` means across users and multiple worker processes
- **End-to-end onboarding walkthrough**
- **Why three layers** — which threat each layer addresses
- **Key files and tuning guide**

It follows the same style as your other docs in `/docs` (e.g. `auth-login-flow.md`).

---

**User**

What is the purpose of adaptfit-api\services\redis.js?
I dont think we used a redis client previously for the workers, why do we need it now?

