**What technology/library are you using?**

We are using **Server-Sent Events (SSE)** for real-time enablement.

On the backend, the Express status endpoint keeps the onboarding status response open with `Content-Type: text/event-stream` and sends progress updates using `res.write(...)`.

On the frontend, we use `@microsoft/fetch-event-source` to receive those SSE messages during the onboarding submit flow and update the React UI in real time.

We also use **BullMQ task queues** for background onboarding validation. The frontend does not talk directly to the worker. Instead, the Express route enqueues a BullMQ job, and a reusable `streamQueueJobStatus(...)` helper listens for that job's progress events and forwards them to the browser over SSE.

## End-To-End Flow

1. The user clicks **Submit answers** on the onboarding confirmation page.

2. `Onboarding.tsx` immediately moves the user to the result/progress view and calls:

```ts
onboardingService.submitProfileWithProgress(profile, onProgress)
```

3. `onboarding-service.ts` starts the onboarding validation job:

```ts
const response = await fetch(`${API_BASE_URL}/onboarding`, {
	method: "POST",
	credentials: "include",
	headers: {
		"Content-Type": "application/json",
	},
	body: JSON.stringify({ profile }),
});
```

4. The backend receives the request at:

```text
POST /onboarding
```

5. The route validates the submitted onboarding profile locally with Zod. If local validation fails, it returns a normal JSON error response.

6. If local validation passes, the route adds a job to the BullMQ onboarding validation queue:

```js
const { queue } = getQueueWithListener(VALIDATE_ONBOARDING_QUEUE_NAME);
const job = await queue.add(`${VALIDATE_ONBOARDING_QUEUE_NAME}-${userId}`, {
	userId,
	profile,
});
```

7. The backend returns the job ID and the SSE status URL:

```json
{
	"jobId": "123",
	"statusUrl": "/onboarding/status/123/stream"
}
```

8. `onboarding-service.ts` then opens a streaming request with `@microsoft/fetch-event-source`:

```ts
fetchEventSource(`${API_BASE_URL}${statusUrl}`, {
	method: "GET",
	credentials: "include",
	headers: {
		Accept: "text/event-stream",
	},
});
```

9. The backend receives the stream request at:

```text
GET /onboarding/status/:jobId/stream
```

10. The onboarding status route uses `streamQueueJobStatus(VALIDATE_ONBOARDING_QUEUE_NAME, onCompleted)`. The reusable status helper confirms the job exists and belongs to the logged-in user. Then it enables SSE by setting:

```js
res.setHeader("Content-Type", "text/event-stream");
res.setHeader("Connection", "keep-alive");
res.setHeader("Cache-Control", "no-cache");
```

11. The reusable status helper listens for BullMQ progress events for that specific job and forwards them to the browser:

```js
listener.on("progress", handleProgress);
```

12. The worker receives the job, calls OpenRouter, and updates BullMQ progress at key milestones:

```js
await job.updateProgress({
	stage: "ai_validation",
	message: "Asking the AI validator to review your details.",
});
```

13. The backend sends progress events to the frontend with:

```js
res.write(`data: ${JSON.stringify(event)}\n\n`);
```

Example streamed event:

```json
{
	"type": "progress",
	"stage": "ai_validation",
	"message": "Asking the AI validator to review your details."
}
```

14. The frontend receives each SSE message in `onmessage`, parses `message.data`, and updates React state:

```ts
onProgress({
	stage: event.stage,
	message: event.message,
});
```

15. `Onboarding.tsx` appends the progress event to `submissionProgress`, which re-renders the validation timeline immediately.

16. The worker parses the AI validation output and returns a structured result:

```js
{
	invalidFields: []
}
```

The router reads `invalidFields` from that result.

If invalid fields exist, the backend sends an SSE `error` event and closes the stream:

```json
{
	"type": "error",
	"error": "You need to fix 1 issue: injuriesOrLimitations.",
	"invalidFields": ["injuriesOrLimitations"]
}
```

17. If validation passes, the backend saves the onboarding profile, sends a final `complete` event with the updated user, and closes the stream:

```json
{
	"type": "complete",
	"user": {}
}
```

## Current Status Events

```text
received       -> Frontend has started the submit flow
queued         -> Status stream is connected to the queued job
ai_validation  -> Worker is asking OpenRouter to validate answers
saving         -> Validation passed and the profile is being saved
error          -> Validation, worker, model, or save failure
complete       -> Final SSE event with the updated user
```

`received` is added by the frontend before the job is created. `complete` is a final SSE event, not a normal progress row; the frontend uses it to mark the submission successful and store the returned user.

## Important Detail

We are **not streaming the raw model response** to the frontend.

OpenRouter validation currently runs as a normal request/response call inside the worker. The real-time part is the app-level progress around the queued task:

```text
request received -> queued -> AI validation -> saving -> complete
```

This keeps the frontend UI focused on useful status updates instead of exposing raw validation JSON or partial model output.

## Why SSE Fits This Use Case

SSE is a good fit because the app only needs one-way updates from the backend to the frontend while onboarding validation runs.

We do not need WebSockets because the browser is not sending continuous messages back to the server. It sends one form submission, then listens for progress.

`@microsoft/fetch-event-source` is used instead of the browser's native `EventSource` because it gives us a fetch-style API with credentials, headers, retry behavior, and better lifecycle control. The onboarding submit is still a normal `POST`; the SSE status stream is a separate authenticated `GET`.

The backend does not need a special SSE library for this route. Express can send SSE events directly by setting the correct headers and writing messages in SSE format.
