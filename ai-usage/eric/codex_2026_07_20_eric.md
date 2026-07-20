# Fix progress bar validation

> can you make it so progress bar is not 100% when its still validating, and when there is an error do not increment the progress

<details><summary>10 previous messages</summary>

> I’ll trace the onboarding progress flow from the worker through the stream middleware to the UI, then patch the smallest layer that owns the incorrect progress math.
>
> <details><summary>Ran 5 commands</summary>
>
> - Ran `Get-Content -Path adaptfit-app/src/pages/Onboarding.tsx`
> - Ran `Get-Content -Path adaptfit-api/middleware/queue_status_stream.js`
> - Ran `Get-Content -Path adaptfit-api/workers/verify-onboarding-worker.js`
> - Ran `Get-Content -Path adaptfit-app/src/api/onboarding-service.ts`
> - Ran `Get-Content -Path adaptfit-api/routers/onboarding_router.js`
>
> </details>
>
> The UI’s main step progress is based only on `stepIndex`, so moving to the Result step immediately renders 100% even while the backend is still validating. I’m going to make the Result step use submission status/progress instead, and treat error events as status messages rather than completed progress.
>
> <details><summary>Ran 4 commands</summary>
>
> - Ran `rg "submissionProgress|progressPercent|OnboardingProgressEvent" adaptfit-app/src adaptfit-api -n`
> - Ran `rg "Onboarding" adaptfit-app/src -g "*.test.*" -g "*.spec.*" -n`
> - Ran `Get-ChildItem -Path adaptfit-app -Force`
> - Ran `Get-Content -Path adaptfit-app/package.json`
>
> </details>
>
> I found no existing onboarding tests, so this is a focused UI patch. The backend already marks AI validation, saving, and completion as distinct stages; I’m going to map those stages into the last slice of the progress bar and ignore `error` for that calculation.
>
> <details><summary>Edited 1 file</summary>
>
> - Wrote `./adaptfit-app/src/pages/Onboarding.tsx` (+28 -2)
>
> </details>
>
> The Result step now gets its progress from completed submission stages rather than the page index. Error events are still shown to the user, but they are filtered out of the progress calculation.
>
> <details><summary>Ran 1 command</summary>
>
> - Ran `npm run lint`
>
> </details>
>
> Lint passes for the frontend after the change. I’m doing one quick diff check so I can summarize exactly what changed.
>
> <details><summary>Ran 2 commands</summary>
>
> - Ran `git diff -- adaptfit-app/src/pages/Onboarding.tsx`
> - Ran `rg "submissionProgressStages|submissionProgressPercent|progressPercent" adaptfit-app/src/pages/Onboarding.tsx -n`
>
> </details>
</details>

Implemented in [Onboarding.tsx](</d:/Eric/University/Year 3/CSCC09/project-adaptfit/adaptfit-app/src/pages/Onboarding.tsx:56>).

The progress bar no longer jumps to 100% just because the UI moved to the Result step. It now advances through submission stages: `start`, `ai_validation`, `saving`, and `complete`, with 100% reserved for actual success.

Error events are filtered out of the progress calculation, so showing an error message does not increment the bar.

Verification: `npm run lint` passes in `adaptfit-app`.
