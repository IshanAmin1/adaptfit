# Optimize plan generation output

> Look at plan generation and what it returns and check what is used in frontend, If it is not used remove it form being included to reduce prompt output response so it takes shorter time to create

<details><summary>28 previous messages</summary>

> I’ll trace the plan generation payload end to end, then compare it with the frontend consumers before trimming anything. I’m going to start by mapping the repo structure and searching for plan-related generation code/usages.
>
> The broad search found the backend plan service and the frontend `Plan` page/types. I’m narrowing that now to the generated JSON contract and the exact fields the UI reads, so the removal is based on real usage rather than guesswork.
>
> A useful thing surfaced already: some bulky fields are no longer model-generated at all. Metadata, disclaimer, BMI, BMR, and TDEE are computed by the backend after the AI response, so the remaining savings are in fields the model still emits but the app never displays or needs for logging.
>
> The current frontend reads target muscle group, equipment, sets/reps, alternatives, macros, one sample meal, and adaptive notes. `rest_seconds` appears to be generated and stored but not surfaced anywhere in the UI or logging flow, so that’s the cleanest field to trim from model output.
>
> I’m going to make two trims: remove `rest_seconds` from the AI-generated exercise schema because nothing consumes it, and cap generated `sample_meals` to one because the frontend only ever reads `sample_meals[0]`. I’ll also remove the duplicate legacy `plan` wrapper from the API serializer and update the adaptation code so it works from the lean top-level shape.
>
> I’ve confirmed the duplicate serializer fields aren’t referenced by the React source. Now I’m applying a focused patch in the plan generation service, serializer, and frontend plan type.
>
> The first patch missed because the file’s exact shape differs a little around the nested arrays. I’ve got the line-level view now, so the next patch will be smaller and less fussy.
>
> <details><summary>Edited a file</summary>
>
> - Wrote `./adaptfit-api/services/plan-generation.js` (+0 -1)
>
> </details>
>
> Good, the schema edit is underway. I’m continuing with small patches so each removal lands cleanly.
>
> <details><summary>Edited a file</summary>
>
> - Wrote `./adaptfit-api/services/plan-generation.js` (+0 -2)
>
> </details>
>
> The nested `sample_meals` block is being a little particular about matching, so I’m switching to a narrower line edit: keep the schema body and only add the length constraint at the array close.
>
> <details><summary>Edited a file</summary>
>
> - Wrote `./adaptfit-api/services/plan-generation.js` (+2 -2)
>
> </details>
>
> The model-facing schema now expects a single sample meal. I’m leaving the full saved-plan validator tolerant of older existing plans, which avoids breaking users who already have multiple meals stored from prior generations.
>
> <details><summary>Edited a file</summary>
>
> - Wrote `./adaptfit-api/services/plan-generation.js` (+5 -3)
>
> </details>
>
> Next I’m cleaning up the prompt wording and adaptation baseline so it no longer asks for or echoes removed fields.
>
> <details><summary>Edited a file</summary>
>
> - Wrote `./adaptfit-api/services/plan-generation.js` (+17 -8)
>
> </details>
>
> The plan service is now leaner for new generation and adaptation. I’m trimming the API serializer next so React stops receiving fields it never reads.
>
> <details><summary>Edited a file</summary>
>
> - Wrote `./adaptfit-api/utils/models/plans.js` (+11 -22)
>
> </details>
>
> One more useful savings pass: old saved plans might still contain `rest_seconds` or several sample meals, so I’m normalizing the serialized response too. That means both newly generated plans and older stored plans come back in the lean shape the frontend actually uses.
>
> <details><summary>Edited a file</summary>
>
> - Wrote `./adaptfit-api/utils/models/plans.js` (+39 -16)
>
> </details>
>
> I noticed the flattened exercise list should keep its day/session tags, so I’m preserving that while still stripping the unused field. Tiny adjustment, then I’ll run the checks.
>
> <details><summary>Edited 2 files</summary>
>
> - Wrote `./adaptfit-api/utils/models/plans.js` (+1 -1)
> - Wrote `./adaptfit-app/src/types/plan.ts` (+11 -12)
>
> </details>
>
> The frontend types now match the lean contract. I’m searching for any lingering references and then I’ll run the available build/lint checks.
>
> There were already plan-generation changes in the working tree compared with `HEAD`, so I’m being careful to validate the current file state rather than treating the whole diff as mine. The remaining `previousPlan?.plan` is intentional backward compatibility for older job/serialized shapes.
>
> Validation passed for the touched backend files and the frontend production build. I’m doing a final status/diff check now so I can give you the exact files and what changed without hiding any generated artifacts.
>
> The status shows two pre-existing modified frontend files, `InsightsCard.tsx` and `PlanCharts.tsx`, that I didn’t touch. My changes are limited to the plan generation service, plan serializer, and plan type.
>
> The targeted checks are clean. I’m going to run the frontend lint as one extra pass; if it fails on unrelated existing changes, I’ll call that out separately.
>
> Frontend lint passed too. I’m just pulling the concise diff summary now, then I’ll wrap this up.
</details>

Done. I trimmed the plan payload where frontend usage showed it was unnecessary.

Changed:
- [plan-generation.js](./adaptfit-api/services/plan-generation.js:13): removed `rest_seconds` from AI-generated exercises.
- [plan-generation.js](./adaptfit-api/services/plan-generation.js:84): capped generated `sample_meals` to exactly one meal, since the frontend only uses `sample_meals[0]`.
- [plans.js](./adaptfit-api/utils/models/plans.js:14): strips `rest_seconds` from serialized plans, including older saved plans.
- [plans.js](./adaptfit-api/utils/models/plans.js:27): serializes only the first sample meal.
- [plans.js](./adaptfit-api/utils/models/plans.js:38): removed unused API response fields like duplicate nested `plan`, `userId`, `onboardingProfileId`, `createdAt`, and `updatedAt`.
- [plan.ts](./adaptfit-app/src/types/plan.ts:6): updated frontend types to match the leaner contract.

Validation passed:
- `node --check adaptfit-api/services/plan-generation.js`
- `node --check adaptfit-api/utils/models/plans.js`
- `npm run build` in `adaptfit-app`
- `npm run lint` in `adaptfit-app`

Small note: `adaptfit-app/src/components/InsightsCard.tsx` and `adaptfit-app/src/components/plan/PlanCharts.tsx` were already modified in the working tree; I left them alone.

> I also removed the altneratives as well, check over and see if it is correct. Remove any code I forgot to remove related to this.

<details><summary>14 previous messages</summary>

> Got it. I’ll remove exercise alternatives from the generated schema/prompt and strip them from serialized plans, then remove the frontend display/type usage so older saved plans don’t keep sending that extra payload either.
>
> <details><summary>Ran 4 commands</summary>
>
> - Ran `Get-Content -Raw adaptfit-app\src\types\plan.ts`
> - Ran `rg -n "alternatives|PlanExerciseAlternative|reason_for_alternative" adaptfit-api adaptfit-app\src -S`
> - Ran `Get-Content -Raw adaptfit-api\services\plan-generation.js`
> - Ran `Get-Content -Raw adaptfit-app\src\pages\Plan.tsx`
>
> </details>
>
> I found alternatives only in the plan generator contract, the plan page display, and the TS type. I’m editing those now, plus the serializer so old stored `alternatives` arrays are stripped before reaching the app.
>
> <details><summary>Edited a file</summary>
>
> - Wrote `./adaptfit-api/services/plan-generation.js` (+11 -30)
>
> </details>
>
> Backend generation no longer asks the model for alternatives. I’m stripping old saved alternatives in serialization and removing the frontend rendering/type next.
>
> <details><summary>Edited a file</summary>
>
> - Wrote `./adaptfit-api/utils/models/plans.js` (+1 -1)
>
> </details>
>
> Now the API will avoid sending alternatives even for older records. I’m removing the UI block that showed them and tightening the frontend type.
>
> <details><summary>Edited 2 files</summary>
>
> - Wrote `./adaptfit-app/src/pages/Plan.tsx` (+5 -13)
> - Wrote `./adaptfit-app/src/types/plan.ts` (+4 -10)
>
> </details>
>
> The code edits are in. I’m checking for leftover references to alternatives and then I’ll run the same syntax/build/lint verification.
>
> <details><summary>Ran 3 commands</summary>
>
> - Ran `rg -n "alternatives|PlanExerciseAlternative|reason_for_alternative" adaptfit-api adaptfit-app\src -S`
> - Ran `node --check adaptfit-api\services\plan-generation.js`
> - Ran `node --check adaptfit-api\utils\models\plans.js`
>
> </details>
>
> No frontend or generator references remain; the only `alternatives` mention is the serializer intentionally dropping old data. Backend syntax checks passed, and I’m running the frontend checks now.
>
> <details><summary>Ran 2 commands</summary>
>
> - Ran `npm run build`
> - Ran `npm run lint`
>
> </details>
>
> Build and lint passed. I’m doing one final status check so the handoff is crisp.
>
> <details><summary>Ran 2 commands</summary>
>
> - Ran `git status --short`
> - Ran `git diff --stat -- adaptfit-api\services\plan-generation.js adaptfit-api\utils\models\plans.js adaptfit-app\src\pages\Plan.tsx adaptfit-app\src\types\plan.ts`
>
> </details>
</details>

Done. I removed exercise alternatives from both sides:

- Backend plan generation no longer requests or validates `alternatives`.
- API serialization strips `alternatives` from older saved plans too.
- Frontend type no longer includes `alternatives`.
- Plan page no longer renders the alternatives section.

Verified with:
- `node --check` on touched backend files
- `npm run build`
- `npm run lint`

Note: `InsightsCard.tsx` and `PlanCharts.tsx` are still pre-existing modified files that I did not touch.

> I also removed the standard disclaimer as it is noise, check over similarilty as previous request

<details><summary>18 previous messages</summary>

> Yep, that’s a good trim. I’ll remove the generated/stored disclaimer from the plan schema and metadata, then update the frontend plan type if it still expects that field.
>
> <details><summary>Ran 3 commands</summary>
>
> - Ran `rg -n "disclaimer|STANDARD_DISCLAIMER|metadata\.disclaimer" adaptfit-api adaptfit-app\src -S`
> - Ran `Get-Content -Raw adaptfit-api\services\plan-generation.js`
> - Ran `Get-Content -Raw adaptfit-app\src\types\plan.ts`
>
> </details>
>
> The only app-side dependency is the TypeScript metadata shape; nothing renders the disclaimer. I’m removing it from the backend saved metadata and stripping it from serialized older plans too.
>
> <details><summary>Ran 2 commands</summary>
>
> - Ran `Get-Content -Raw adaptfit-api\utils\models\plans.js`
> - Ran `rg -n "metadata\.user_goal|metadata\.generated_at|metadata\.plan_version|metadata\.disclaimer|plan\.metadata" adaptfit-app\src adaptfit-api -S`
>
> </details>
>
> I’m keeping `generated_at`, `plan_version`, and `user_goal` because the plan flow still uses goal/date/version metadata, but removing only the unused disclaimer.
>
> <details><summary>Edited a file</summary>
>
> - Wrote `./adaptfit-api/services/plan-generation.js` (+6 -11)
>
> </details>
>
> The stored metadata no longer includes the standard disclaimer. I’m also removing the explicit disclaimer mention from the system prompt line to shave the prompt a bit further.
>
> <details><summary>Edited a file</summary>
>
> - Wrote `./adaptfit-api/services/plan-generation.js` (+1 -1)
>
> </details>
>
> Now I’m normalizing metadata in the serializer so old saved plans won’t keep sending the legacy `disclaimer` field to the frontend.
>
> <details><summary>Edited a file</summary>
>
> - Wrote `./adaptfit-api/utils/models/plans.js` (+10 -3)
>
> </details>
>
> Backend serialization is trimmed. I’m updating the frontend type and then I’ll run checks.
>
> <details><summary>Edited a file</summary>
>
> - Wrote `./adaptfit-app/src/types/plan.ts` (+5 -6)
>
> </details>
>
> The type is updated. I’m checking for any lingering disclaimer references and validating syntax/build/lint now.
>
> <details><summary>Ran 3 commands</summary>
>
> - Ran `node --check adaptfit-api\services\plan-generation.js`
> - Ran `rg -n "disclaimer|STANDARD_DISCLAIMER" adaptfit-api adaptfit-app\src -S`
> - Ran `node --check adaptfit-api\utils\models\plans.js`
>
> </details>
>
> The only remaining disclaimer reference is the serializer intentionally dropping old stored values. Backend syntax checks passed; I’m running the frontend checks.
>
> <details><summary>Ran 2 commands</summary>
>
> - Ran `npm run build`
> - Ran `npm run lint`
>
> </details>
>
> Build and lint passed. I’m doing the final status check now.
>
> <details><summary>Ran 2 commands</summary>
>
> - Ran `git status --short`
> - Ran `git diff --stat -- adaptfit-api\services\plan-generation.js adaptfit-api\utils\models\plans.js adaptfit-app\src\types\plan.ts`
>
> </details>
</details>

Done. Removed the standard disclaimer from the stored/generated plan metadata and frontend type.

Also added serializer cleanup so older saved plans won’t send `metadata.disclaimer` back to the app.

Verified:
- `node --check` on backend files
- `npm run build`
- `npm run lint`

Still unchanged by me: the pre-existing modified `InsightsCard.tsx` and `PlanCharts.tsx`.

> function serializeExercise(exercise) {
> 	const { alternatives, rest_seconds, ...serializedExercise } = exercise;
>
> 	return serializedExercise;
> }
>
> function serializeSchedule(schedule = []) {
> 	return schedule.map((session) => ({
> 		...session,
> 		exercises: (session.exercises || []).map(serializeExercise),
> 	}));
> }
>
> function serializeNutrients(nutrients = {}) {
> 	return {
> 		...nutrients,
> 		sample_meals: (nutrients.sample_meals || []).slice(0, 1),
> 	};
> }
>
> function serializeMetadata(metadata = {}) {
> 	const { disclaimer, ...serializedMetadata } = metadata;
>
> 	return serializedMetadata;
>
> why do we need this

Those helpers are only for backward compatibility with plans already saved in the database.

Even though new generations no longer include `alternatives`, `rest_seconds`, extra `sample_meals`, or `disclaimer`, older plan rows may still have them in JSON columns. When `GET /plans` returns one of those old plans, these helpers strip the unused fields before sending the response to the frontend.

So:

- `serializeExercise`: removes old `alternatives` and `rest_seconds`.
- `serializeSchedule`: applies that cleanup to every exercise in every day.
- `serializeNutrients`: sends only the first sample meal because frontend only uses `sample_meals[0]`.
- `serializeMetadata`: removes old `disclaimer`.

If you do not care about old saved plan payloads, we can remove these helpers and just return the stored JSON directly. But then existing users with old plans may still receive the larger payload until they generate a new plan.

> will it break existing functionaly if i do not incldue?

For **newly generated plans**, no. If the generator schema no longer includes those fields, the app should work without these cleanup helpers.

For **existing saved plans**, also probably no functional break, but the payload stays larger:
- Extra fields like `alternatives`, `rest_seconds`, and `disclaimer` are harmless because the frontend no longer reads them.
- Multiple `sample_meals` are also harmless because the frontend only reads index `0`.

So the helpers are not required for correctness. They are just response-size cleanup for old database records.

One caveat: keep the frontend access safe. Since we changed the type to one sample meal, but old/new data still needs at least one meal. The model schema enforces that for new plans. Existing plans likely already have meals.

> Okay I have removed that excess compatibility code. Check over.

<details><summary>10 previous messages</summary>

> Makes sense. I’ll remove those cleanup helpers and return the stored plan JSON directly again, while keeping the earlier removal of unused top-level response fields.
>
> <details><summary>Ran 2 commands</summary>
>
> - Ran `Get-Content -Raw adaptfit-api\utils\models\plans.js`
> - Ran `rg -n "serializeExercise|serializeSchedule|serializeNutrients|serializeMetadata|flattenExercises" adaptfit-api\utils\models\plans.js adaptfit-api -S`
>
> </details>
>
> I’m keeping `flattenExercises` because it’s still needed to save the flattened exercise list with day/session attached. The cleanup-only helpers are the ones coming out.
>
> <details><summary>Edited a file</summary>
>
> - Wrote `./adaptfit-api/utils/models/plans.js` (+4 -34)
>
> </details>
>
> The helper cleanup is removed now. I’m running a quick syntax check and frontend build/lint to make sure returning the direct stored fields doesn’t disturb the app.
>
> <details><summary>Ran 4 commands</summary>
>
> - Ran `rg -n "serializeExercise|serializeSchedule|serializeNutrients|serializeMetadata" adaptfit-api\utils\models\plans.js -S`
> - Ran `node --check adaptfit-api\utils\models\plans.js`
> - Ran `npm run build`
> - Ran `npm run lint`
>
> </details>
>
> All checks passed; the search command found no remaining cleanup helper names, which is why it returned a nonzero “no matches” code. I’m doing a final status/diff check.
>
> <details><summary>Ran 3 commands</summary>
>
> - Ran `Get-Content -Raw adaptfit-api\utils\models\plans.js`
> - Ran `git diff --stat -- adaptfit-api\utils\models\plans.js`
> - Ran `git status --short`
>
> </details>
>
> The file is valid, but the small patch left a couple indentation lines ugly around the ternary. I’m tidying that so the code stays readable.
>
> <details><summary>Edited a file, ran 2 commands</summary>
>
> - Wrote `./adaptfit-api/utils/models/plans.js` (+3 -3)
> - Ran `node --check adaptfit-api\utils\models\plans.js`
> - Ran `git diff -- adaptfit-api\utils\models\plans.js`
>
> </details>
</details>

Done. I removed those cleanup serializers.

`serializePlan` now returns the stored `metadata`, `nutrients`, `schedule`, and `exercises` directly again, while still leaving out the unused top-level duplicate fields we removed earlier.

Verified:
- `node --check adaptfit-api/utils/models/plans.js`
- `npm run build`
- `npm run lint`

> for plan generation is there anything else we could do to save time, like running requests in concurrency, etc

Yes. Biggest wins, in order:

1. **Parallelize ExerciseDB lookups**
   Right now `planWithExerciseReferencesFromAPI()` looks up each unique exercise one-by-one. That can easily add seconds after the AI response. Switching to `Promise.all` with a small concurrency limit would likely help more than trimming a few JSON fields.

2. **Cache ExerciseDB matches**
   Many plans reuse names like `Squat`, `Bench Press`, `Plank`, etc. A simple DB/cache table or Redis cache keyed by normalized exercise name would avoid repeated API calls.

3. **Stop asking AI for nutrition targets**
   Backend already computes BMR/TDEE. You could also compute daily calories/macros deterministically from goal, weight, and TDEE, then only ask AI for workouts plus one meal idea. That reduces model output and makes nutrition more consistent.

4. **Remove `target_physique_description` if not important**
   It is only shown as text in the Plan overview. If you do not care about that sentence, removing `user_summary` from model output trims more.

5. **Consider removing `adaptive_notes`**
   It powers the Insights page’s “Plan calibration” text. If that page is not important, remove `adaptive_notes.adjustment_triggers` from generation/adaptation.

6. **Reduce max exercises further**
   Output size scales mostly with `days * exercises`. If plans are too slow, cap each session at fewer movements, especially for 45/60 min sessions.

My pick: first do **parallel/cached ExerciseDB lookups**, then decide whether `target_physique_description` and `adaptive_notes` are worth keeping. Those are cleaner wins than shaving tiny fields.

> Is there a way to use promise.all to do concurrency for exercisedb api calls.

<details><summary>6 previous messages</summary>

> Yep, we can make it simpler with plain `Promise.all`. Since generated plans now have fewer exercises, the small burst should be okay and the code will be much easier to explain for coursework.
>
> <details><summary>Edited a file</summary>
>
> - Wrote `./adaptfit-api/services/exercise-db.js` (+5 -29)
>
> </details>
>
> Swapped it to `Promise.all` directly. I’m running the quick checks again.
>
> <details><summary>Ran 3 commands</summary>
>
> - Ran `node --check adaptfit-api\services\exercise-db.js`
> - Ran `npm run build`
> - Ran `npm run lint`
>
> </details>
>
> Checks passed. I’ll grab the final diff for that file so the handoff is precise.
>
> <details><summary>Ran a command</summary>
>
> - Ran `git diff -- adaptfit-api\services\exercise-db.js`
>
> </details>
</details>

Yep, switched it to plain `Promise.all`.

Now `planWithExerciseReferencesFromAPI()` does:

```js
const referenceEntries = await Promise.all(
	exerciseNameList.map(async (exerciseName) => {
		// lookup each exercise in parallel
	}),
);
```

Then it builds the same `Map` from those results. Much simpler, and still keeps the same error handling per exercise.

Verified again:
- `node --check adaptfit-api/services/exercise-db.js`
- `npm run build`
- `npm run lint`

> const referencesByName = new Map(referenceEntries);
>
> what is this for

`referenceEntries` looks like this after `Promise.all` finishes:

```js
[
	["Squat", { exerciseDbId: "...", exerciseDbName: "squat" }],
	["Bench Press", { exerciseDbId: "...", exerciseDbName: "bench press" }],
	["Plank", null],
]
```

This line:

```js
const referencesByName = new Map(referenceEntries);
```

turns that array into a lookup table, so later the code can quickly do:

```js
referencesByName.get(exercise.exercise_name)
```

That lets each exercise in the plan get its matching ExerciseDB info added back in.

Example:

```js
{
	exercise_name: "Squat",
	sets: 3,
	reps: "10",
	exerciseDbId: "...",
	exerciseDbName: "squat"
}
```

So the `Map` is just replacing the old loop where we did:

```js
referencesByName.set(exerciseName, reference);
```
