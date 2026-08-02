# Redirect pending plan jobs

> Currently, when the user's onboarding plan is being verified and generated in the background, the user is able to log out or click the manage membership buttons which brings them out of the screen that shows the plan is being generated. If they log back in back to the page where they can see their manage their membership and start onboarding buttons BEFORE the worker has finished, they are able to start filling out the onboarding form again even though a worker is in the progress. I think we should redirect to the page showing the progess of plan generation if a job is pending already.

<details><summary>17 previous messages</summary>

> I’ll trace the onboarding and membership flow first so we can hook this into the existing state checks instead of inventing a parallel flag. After that I’ll patch the narrowest path that lets returning users get routed back to the generation progress screen.
>
> One of the parallel searches hit a Windows sandbox spawn issue, but the repo listing came through. I’ll fall back to smaller PowerShell reads/searches and keep the thread moving.
>
> I found this is a split React app plus Express API. The likely fix is either in the frontend route guards or in the API’s onboarding status endpoint, so I’m opening those pieces now.
>
> The backend already uses one stable BullMQ job id per user and returns a status stream on duplicate submissions. The gap is that the UI only knows about that stream during the original submit, so I’m checking the plan queue endpoints to expose or reuse a “current pending job” check on page load.
>
> There’s a subtle server-side shape here: the validation stream is also where the API saves onboarding and enqueues the plan. So the cleanest user-visible fix is to let the page rediscover the existing job and reconnect to the same stream, instead of just blocking the form.
>
> I’m going to make three coordinated edits: add a small “current pending onboarding/plan job” API, teach the onboarding service to reconnect to a returned status stream, and have both Subscribe and Onboarding route users back into the progress view when that job exists.
>
> <details><summary>Edited 4 files</summary>
>
> - Wrote `./adaptfit-api/services/tasks.js` (+41 -11)
> - Wrote `./adaptfit-api/routers/onboarding_router.js` (+58 -14)
> - Wrote `./adaptfit-app/src/api/onboarding-service.ts` (+112 -13)
> - Wrote `./adaptfit-app/src/pages/Onboarding.tsx` (+125 -12)
>
> </details>
>
> The onboarding page can now reattach to an existing stream. I’m wiring the membership page next so users don’t even get a chance to press “Start onboarding” or “Open billing portal” while a generation job is already active.
>
> <details><summary>Edited a file</summary>
>
> - Wrote `./adaptfit-app/src/pages/Subscribe.tsx` (+57 -14)
>
> </details>
>
> The route mount is straightforward (`/onboarding`), so the new `/onboarding/pending` endpoint lands where the frontend expects it. I’m running the app build now to catch any TypeScript issues from the reconnect flow.
>
> Frontend build passed. I’m doing one lint pass as a second check, mostly for hook dependencies and unused imports after the new effects.
>
> Lint found the new React compiler rule about synchronous state updates inside effects. Easy cleanup: I’ll move those updates into async callbacks so the behavior stays the same without tripping the rule.
>
> <details><summary>Edited 2 files</summary>
>
> - Wrote `./adaptfit-app/src/pages/Onboarding.tsx` (+11 -4)
> - Wrote `./adaptfit-app/src/pages/Subscribe.tsx` (+8 -3)
>
> </details>
>
> Those hook-rule fixes are in place. I’m rerunning lint now; if it passes, I’ll do one more build because lint may have formatted files.
>
> Lint is clean. Since `eslint --fix` can touch formatting, I’m rerunning the frontend build once more against the final files.
>
> Build is green too. I’m checking the final diff now so I can give you the short version of exactly what changed.
>
> The diff looks scoped to the queue status and the two pages. One nuance I’m checking before I wrap: the API files are plain JS, so I’m running a quick syntax check on the touched backend modules too.

</details>

Implemented the pending-job redirect/reconnect flow.

What changed:

- Added `findActiveUserJob()` in `adaptfit-api/services/tasks.js` so the API can find a user’s active BullMQ job.
- Added `GET /onboarding/pending` in `adaptfit-api/routers/onboarding_router.js`, checking both onboarding validation and plan generation queues.
- Added frontend helpers in `adaptfit-app/src/api/onboarding-service.ts` to fetch pending jobs and reconnect to their SSE status stream.
- Updated `Onboarding.tsx` to show the progress/result screen and resume live updates when a pending job exists.
- Updated `Subscribe.tsx` to redirect active subscribers to `/onboarding` if a pending onboarding/plan job exists, preventing “Start onboarding” or billing portal clicks from pulling them away.

Verification passed:

- `npm run lint`
- `npm run build` in `adaptfit-app`
- `node --check` on the touched backend files.
