# Add onboarding rejection reason

> can you have it so with onboarding ai validation it gives the reason for rejection

<details><summary>10 previous messages</summary>

> I’ll trace the onboarding AI validation path first so the rejection result is shaped consistently with the existing API rather than guessing at the response contract.
>
> The relevant pieces are the validation worker and the onboarding router’s status/completion handler. I’m reading those now to see whether the queue result can carry richer detail without breaking callers.
>
> The worker currently returns only `{ invalidFields }`, and the SSE error path forwards only those fields. I’m going to keep `invalidFields` for compatibility and add a `rejectionReasons` object keyed by field name, then include it in the SSE error payload.
>
> <details><summary>Edited 1 file</summary>
>
> - Wrote `./workers/verify-onboarding-worker.js` (+58 -12)
>
> </details>
>
> The worker now asks for structured reasons and normalizes the result. Next I’m wiring that through the router and stream middleware so clients receive the details when validation rejects the profile.
>
> <details><summary>Edited 1 file</summary>
>
> - Wrote `./routers/onboarding_router.js` (+12 -2)
>
> </details>
>
> The synchronous validation path still behaves as before; the new reason object is only present when there are AI-generated reasons. I’m adding it to the shared SSE error envelope now.
>
> <details><summary>Edited 1 file</summary>
>
> - Wrote `./middleware/queue_status_stream.js` (+1 -0)
>
> </details>
>
> I’m going to run a syntax check over the touched modules. This avoids starting the app or workers, so it won’t require database or Redis connectivity.
>
> The touched files pass `node --check`. I’m doing one diff pass to make sure the API shape is coherent and there aren’t any accidental edits.
</details>

Implemented AI rejection reasons for onboarding validation.

Changed:
- [workers/verify-onboarding-worker.js](d:/Eric/University/Year%203/CSCC09/project-adaptfit/adaptfit-api/workers/verify-onboarding-worker.js): AI now returns `{ invalidFields, rejectionReasons }` instead of only an array.
- [routers/onboarding_router.js](d:/Eric/University/Year%203/CSCC09/project-adaptfit/adaptfit-api/routers/onboarding_router.js): rejection errors now include `rejectionReasons` and the message uses the AI-provided reasons when available.
- [middleware/queue_status_stream.js](d:/Eric/University/Year%203/CSCC09/project-adaptfit/adaptfit-api/middleware/queue_status_stream.js): SSE error events now forward `rejectionReasons`.

Example error shape now includes:

```json
{
  "type": "error",
  "error": "You need to fix 1 issue: The goal target is not realistic for the selected timeframe.",
  "invalidFields": ["goalTarget"],
  "rejectionReasons": {
    "goalTarget": "The goal target is not realistic for the selected timeframe."
  }
}
```

Verification: `node --check` passed for all three touched files.
