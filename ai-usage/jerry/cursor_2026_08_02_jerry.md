# Onboarding flow navigation issue
_Exported on 8/2/2026 at 16:11:31 EDT from Cursor (3.14.7)_

---

**User**

Currently, users are allowed to navigate to different tabs when their first plan is validating or generating, and the SSE connection will resume if they navigate back to the onboarding page.
For the redo onboarding flow, users can kind of do this too, but if they navigate back to the redo page when it's still generating plan or validating, when the job finishes and updates, for some reason the page navigates to the start of the onboarding form page instead of showing that the plan has finished generating, and this only happens if the user navigates back and has to reconnect the session. Note that the onboarding redo form shouldnt even be accessible if the user is on cooldown since they just generated a plan and must wait a day (but manually typing the url onboarding?redo=1 takes me to the form to redo the plan).
Furthermore, confirm that the cooldown ONLY updates/gets set after a plan has generated successfully

---

**Cursor**

I'll trace the onboarding redo flow, SSE reconnection, and cooldown logic in the codebase.


Identifying the bug: when a pending redo job finishes, `hasPendingJob` becomes false and the redo profile effect runs with `hasInitializedRedoProfileRef` still false, resetting `stepIndex` to 0. Implementing fixes for that and the cooldown URL bypass.


I found and fixed both issues. Here is what was going wrong and what changed.

## Redo reconnect jumping back to step 1

**Root cause:** When you returned to `/onboarding?redo=1` during an in-progress job, the pending-job effect correctly put you on the Result step and reconnected SSE. But when the job finished, `hasPendingJob` flipped to `false`, which re-triggered the redo profile initialization effect. That effect had never marked itself as initialized (it was skipped while the job was pending), so it ran `setStepIndex(0)` and reset submission state — wiping the success UI.

**Fix:**
1. Mark redo profile as initialized when reconnecting to a pending job in redo mode.
2. Skip redo profile initialization if submission already succeeded.
3. Treat `submissionState.status === "success"` as a guard so the form cannot reset after completion.

## Cooldown URL bypass

**Root cause:** The Plan page disabled the redo button, but `/onboarding?redo=1` had no cooldown check on the frontend. The API already blocks submission with 429, but the form was still reachable.

**Fix:** When loading the redo form, fetch the latest plan and redirect to `/plan` if `isRedoCooldownActive()` is true. Shared helpers live in `plan-utils.ts` and are used by both `Plan.tsx` and `Onboarding.tsx`.

## Cooldown timing — confirmed

**Yes — cooldown is only set after a plan generates successfully.**

`completed_at` is written only inside `saveOnboardingProfile()`, which is called from plan generation when `persistOnboardingAfterGeneration` is true:

```485:500:adaptfit-api/services/plan-generation.js
	const savedPlan = job.data.persistOnboardingAfterGeneration
		? await sequelize.transaction(async (transaction) => {
				const savedUser = await saveOnboardingProfile(
					job.data.userId,
					profile,
					{
						transaction,
					},
				);

				return saveGeneratedPlan({
					userId: job.data.userId,
					onboardingProfileId: savedUser?.onboardingProfile?.id || null,
					plan,
					transaction,
				});
			})
```

That flag is only passed as `true` from onboarding validation completion (first onboarding and redo):

```199:204:adaptfit-api/routers/onboarding_router.js
	const planJob = await enqueuePlanGeneration(
		userId,
		{ id: null, profile },
		null,
		true,
	);
```

So:
- Validation alone does **not** update `completed_at`
- A failed plan generation does **not** update `completed_at` (save happens inside the successful generation transaction)
- Adaptive/manual plan regeneration (`POST /plans`, weekly adaptation) does **not** update `completed_at` (`persistOnboardingAfterGeneration` defaults to `false`)

The backend redo POST guard already uses this same field:

```159:167:adaptfit-api/routers/onboarding_router.js
function isRedoCooldownActive(user) {
	const completedAt = user?.onboardingProfile?.completed_at;

	if (!completedAt) {
		return false;
	}

	return Date.now() - new Date(completedAt).getTime() < ONE_DAY_MS;
}
```

---

**User**

In a clean manner, add 
@plan-utils.ts (3-4) 
the REDO_COOLDOWN_MS as an env variable using a util function like in the backend's getEnvVariable function to extract this cooldown as an integer, with a fallback. Do the same for backend

---

**Cursor**

I'll find the backend's `getEnvVariable` pattern and apply the same approach for `REDO_COOLDOWN_MS` on both frontend and backend.


I'll add env helpers on both sides and wire `REDO_COOLDOWN_MS` through config files, matching the backend's existing pattern.


Removing the unnecessary re-export from `plan-utils.ts` to keep the config as the single source of truth.


Added env-based cooldown configuration on both sides, following the backend’s existing config pattern.

### Backend
- Added `getNonNegativeIntegerEnv()` in `adaptfit-api/utils/general.js` (allows `0` for testing)
- Added `adaptfit-api/config/env/onboarding.js`:

```js
export const REDO_COOLDOWN_MS = getNonNegativeIntegerEnv(
  "REDO_COOLDOWN_MS",
  24 * 60 * 60 * 1000,
);
```

- `onboarding_router.js` now imports `REDO_COOLDOWN_MS` from config instead of the hardcoded `ONE_DAY_MS = 0`

### Frontend
- Added `adaptfit-app/src/utils/env.ts` with `getEnvVariable()` and `getNonNegativeIntegerEnv()` (Vite-friendly: pass `import.meta.env.VITE_*` directly so Vite can inject it)
- Added `adaptfit-app/src/config/env.ts` as the single source for `REDO_COOLDOWN_MS`
- `plan-utils.ts` imports from config instead of parsing inline
- Typed `VITE_REDO_COOLDOWN_MS` in `vite-env.d.ts`

### Env vars
| Side | Variable | Default |
|------|----------|---------|
| Backend | `REDO_COOLDOWN_MS` | `86400000` (1 day) |
| Frontend | `VITE_REDO_COOLDOWN_MS` | `86400000` (1 day) |

Your frontend `.env` already has `VITE_REDO_COOLDOWN_MS=0` for testing. Set `REDO_COOLDOWN_MS=0` in the backend `.env` as well if you want both sides to match during local testing.

