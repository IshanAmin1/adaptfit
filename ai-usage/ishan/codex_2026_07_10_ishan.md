# Add onboarding subscription gate

> I have currently enabled a subscrption feature that all suers must do to access dashboard. I want to add an onboarding step that rewquires users to be authetnicated and have a suibscription and only prompt them if they have not setup the intial process. It is a form that colects this data:
>
> Age
> Biological sex (needed for calorie/macro calculations)
> Height
> Current weight
>
> Step 2 — Goals
>
> Primary goal (single-select): lose weight / build muscle / improve endurance / general fitness / build strength
> Target weight or timeline (optional)
>
> Step 3 — Experience & health
>
> Experience level: beginner / intermediate / advanced
> Injuries or physical limitations (free text or checklist: knees, back, shoulders, none)
>
> Step 4 — Equipment & schedule
>
> Where you'll train: home / gym / outdoors
> Equipment available (multi-select): dumbbells, barbell, machines, bands, bodyweight only, full gym access
> Days per week available (1–7 or a day-picker)
> Preferred session length (30 / 45 / 60+ min)
>
> Step 5 — Nutrition preferences
>
> Diet type: no restrictions / vegetarian / vegan / keto / other
> Allergies or foods to avoid (free text)
> Meal frequency preference (optional — e.g., 3 meals vs 5 smaller meals)
>
> After plan generation, each exercise shows alternatives that users could select.
>
> and sends it to backend. for now backend doesnt need to do anything with it.
>
> Can you generate intitial flow for the onboarding form

<details><summary>25 previous messages</summary>

> I’ll trace the auth/subscription/dashboard flow first so the onboarding can slot into the app’s existing route and API patterns cleanly. Then I’ll wire the multi-step form and a backend endpoint that accepts the payload without changing plan logic yet.
>
> I found a Vite React app plus an Express API with existing `RequireAuth` and `RequireSubscription` gates. I’m reading those pieces now and checking the user model so the onboarding-complete flag lives in the same auth snapshot the frontend already trusts.
>
> The backend already auto-syncs the schema in dev, which makes adding a small onboarding table/field practical here. I’m going to use a stored onboarding profile plus `hasCompletedOnboarding` on the serialized user, then route subscribed users without that flag to the new flow before dashboard.
>
> The existing route guard is the right hook: authenticated users still go to subscription first, and subscribed users will be steered to onboarding until it’s complete. I’m editing the API user model and adding a guarded onboarding submit endpoint before building the React form.
>
> <details><summary>Edited a file</summary>
>
> - Wrote `./adaptfit-api/models/users.js` (+42 -14)
>
> </details>
>
> The model now has a JSON profile and completion timestamp, so completion is durable and easy to expose with `/auth/me`. Next I’m adding a small router that only accepts submissions from logged-in, subscribed users.
>
> <details><summary>Created a file, edited a file</summary>
>
> - Wrote `./adaptfit-api/routers/onboarding_router.js` (+65 -0)
> - Wrote `./adaptfit-api/app.js` (+7 -5)
>
> </details>
>
> The API endpoint is in place and returns the refreshed user object after saving. I’m wiring the frontend around the same `AuthUser` shape now, including the redirect rule: subscription first, onboarding second, dashboard last.
>
> <details><summary>Created a file, edited 2 files</summary>
>
> - Wrote `./adaptfit-app/src/types/auth.ts` (+5 -4)
> - Wrote `./adaptfit-app/src/api/onboarding-service.ts` (+47 -0)
> - Wrote `./adaptfit-app/src/components/common/RequireSubscription.tsx` (+23 -17)
>
> </details>
>
> The guard can now distinguish “paid but not onboarded” from full dashboard access. I’m adding the multi-step page itself with one section shown at a time and a submit that saves the complete profile.
>
> <details><summary>Created a file, edited 6 files</summary>
>
> - Wrote `./adaptfit-app/src/pages/Onboarding.tsx` (+520 -0)
> - Wrote `./adaptfit-app/src/pages/Onboarding.tsx` (+2 -1)
> - Wrote `./adaptfit-app/src/App.tsx` (+45 -24)
> - Wrote `./adaptfit-app/src/pages/Login.tsx` (+28 -20)
> - Wrote `./adaptfit-app/src/pages/Subscribe.tsx` (+21 -13)
> - Wrote `./adaptfit-app/src/components/Navbar.tsx` (+20 -8)
> - Wrote `./adaptfit-api/routers/onboarding_router.js` (+1 -0)
>
> </details>
>
> The page is more than a shell now: it collects the requested fields step by step and posts the full profile. I’m tightening redirects from login/subscribe/navbar so users land in the right place no matter how they arrive.
>
> <details><summary>Edited a file</summary>
>
> - Wrote `./adaptfit-app/src/pages/Onboarding.tsx` (+40 -0)
>
> </details>
>
> The frontend routing is now consistent: existing paid users who have not onboarded go to `/onboarding`, and completed users go straight to `/dashboard`. I’m running the build/checks next, because TypeScript tends to be a very honest coworker at this stage.
>
> The production frontend build passed, and the new backend files parse cleanly. I’m doing one lint pass now to catch smaller React/TypeScript issues before I call it done.
>
> Lint is configured to scan `dist`, and because I just built the app it’s linting bundled/minified output instead of source. I’m going to run ESLint against `src` directly so we verify the code that matters without changing the project’s lint config.
>
> Source lint passed cleanly. I’m checking the final diff/status now so I can tell you exactly what changed and avoid hiding any generated build artifacts in the handoff.
>
> The working tree only contains the intended source changes; no generated `dist` files are showing as tracked changes. I’m starting the Vite dev server so you can try the flow in-browser, then I’ll give you the URL and verification notes.
>
> Vite is launching in the background. I’m checking its log for the actual port in case 5173 was already taken.
>
> One more quick check: I’m looking at the workout card to see whether exercise alternatives already exist in the UI, since your note mentioned alternatives after plan generation. If they’re not there yet, I’ll add a lightweight selectable version before wrapping up.
>
> The workout card did not have selectable alternatives yet, so I’m adding that small interaction now: each exercise will render alternative buttons and swap the displayed movement when selected.
>
> <details><summary>Edited 2 files</summary>
>
> - Wrote `./adaptfit-app/src/components/common/WorkoutStep.tsx` (+46 -21)
> - Wrote `./adaptfit-app/src/components/WorkoutPlanCard.tsx` (+52 -23)
>
> </details>
>
> Selectable exercise alternatives are in the dashboard card now. I’m rerunning the build and source lint after that extra change.
>
> Build and source lint are both green after the alternatives change. I’m grabbing the final status one last time, then I’ll hand this over.
>
> The dev-server stderr file showed up as an empty untracked file from the background launch, so I’m cleaning up that generated scratch file. The running Vite process and its normal log remain available.
</details>

Implemented the onboarding flow end to end.

What changed:
- Added a protected `POST /onboarding` backend route that requires authentication and an active subscription, then stores the submitted profile on the user.
- Added `hasCompletedOnboarding` to the auth user response.
- Added the multi-step onboarding form at [Onboarding.tsx](./adaptfit-app/src/pages/Onboarding.tsx).
- Updated routing so users go:
  `login -> subscribe -> onboarding -> dashboard`
- Updated dashboard access guard so subscribed users without onboarding are redirected to `/onboarding`.
- Added selectable exercise alternatives in the dashboard workout card.

Verification:
- `npm run build` passed for the frontend.
- `npx eslint src` passed.
- Backend files passed `node --check`.
- Full `npm run lint` still scans `dist` after build, so it fails on bundled output; source lint is clean.

Vite is running here:
`http://127.0.0.1:5173/`

Small note: `.vite-dev.err` is currently an empty generated file held open by the running dev server, so I left it alone.


> For this form do u have suggestions of other goals or maybe add other section

A good set for MVP is what you already have, but I’d add one more option:

**Improve mobility / flexibility**

So the list becomes:

- Lose weight
- Build muscle
- Build strength
- Improve endurance
- Improve mobility / flexibility
- General fitness

I’d avoid adding too many goal choices right now because it makes plan generation messier. If you want more personalization, a better extra section would be **Secondary focus**, optional multi-select:

- Mobility
- Cardio
- Strength
- Muscle definition
- Athletic performance
- Stress relief
- Consistency / habit building

That keeps **Primary goal** clean while still letting users express nuance.

> for targer weight and timeline what is a good input option

For **target weight and timeline**, I’d split it into two optional inputs instead of one free-text field:

**Target weight (kg)**
- Number input
- Optional
- Example placeholder: `75`

**Target date**
- Date input
- Optional
- Lets the user pick a realistic timeline

That’s better than one text box because later the backend can calculate weekly weight-change pace.

A good UX would be:

```tsx
<Field label="Target weight (kg)">
  <TextInput
    type="number"
    min={MIN_REASONABLE_WEIGHT_KG}
    max={MAX_REASONABLE_WEIGHT_KG}
    step={1}
    value={profile.targetWeight || ""}
    placeholder="75"
    onChange={(value) => updateProfile("targetWeight", value)}
  />
</Field>

<Field label="Target date">
  <TextInput
    type="date"
    value={profile.targetDate || ""}
    onChange={(value) => updateProfile("targetDate", value)}
  />
</Field>
```

If you want to keep it simple for now, use one optional field but rename it to:

**Target weight or timeline**

Placeholder:

```text
Example: 75 kg by September, or run 5K in 8 weeks
```

> I have gone over intial form and made changes of my own to be more fleshed out. Can you help me make simple change where if they select a different goal, it shows a different phrase for the target.

Yeah, that would be better.

The target fields should depend on the selected **Primary goal**:

- **Lose weight**: target weight + optional target date
- **Build muscle**: target weight or muscle-gain goal + optional target date
- **Build strength**: strength target, like “bench 100 kg” or “increase squat”
- **Improve endurance**: race/distance/time target, like “run 5K” or “30 min nonstop”
- **General fitness**: habit target, like days/week or consistency goal
- **Improve mobility / flexibility**: mobility target, like “touch toes” or “reduce back tightness”

For MVP, I’d implement this as one dynamic optional text input whose **label and placeholder change** based on `primaryGoal`. That keeps the UI simple but feels personalized.

Example:

```tsx
const goalTargetCopy = {
  lose_weight: {
    label: "Target weight and timeline",
    placeholder: "Example: 75 kg by September",
  },
  build_muscle: {
    label: "Muscle gain target",
    placeholder: "Example: gain 4 kg over 6 months",
  },
  build_strength: {
    label: "Strength target",
    placeholder: "Example: squat 100 kg or improve push-ups",
  },
  improve_endurance: {
    label: "Endurance target",
    placeholder: "Example: run 5K in 8 weeks",
  },
  general_fitness: {
    label: "Fitness target",
    placeholder: "Example: train 4 days/week consistently",
  },
};
```

Then render:

```tsx
<Field label={goalTargetCopy[profile.primaryGoal]?.label || "Target or timeline"}>
  <TextInput
    value={profile.targetWeightOrTimeline || ""}
    placeholder={
      goalTargetCopy[profile.primaryGoal]?.placeholder ||
      "Optional"
    }
    onChange={(value) => updateProfile("targetWeightOrTimeline", value)}
  />
</Field>
```

That’s the best balance for now: dynamic enough to make sense, but not overcomplicated.


> For machines option, when they click it can you provide a way for it to open a drop down of machines like cables, leg press, or they can input which ones

<details><summary>6 previous messages</summary>

> I’ll add a conditional “which machines?” field under Equipment: it will appear only when Machines is selected, offer a few common machine checkboxes/options, and include a free-text box for anything custom.
>
> I found the onboarding payload type and the equipment section. I’m extending the profile with `machineTypes` and `customMachines`, then showing a machine detail panel only when `machines` is selected.
>
> <details><summary>Edited a file</summary>
>
> - Wrote `./adaptfit-app/src/api/onboarding-service.ts` (+2 -0)
>
> </details>
>
> The frontend payload can now carry specific machine selections. I’m adding the UI options and making the machine detail area appear only after the user selects Machines.
>
> <details><summary>Edited a file</summary>
>
> - Wrote `./adaptfit-app/src/pages/Onboarding.tsx` (+49 -3)
>
> </details>
>
> The machine detail panel is in place and clears itself if Machines is deselected, so the saved profile won’t carry stale machine data. I’ll run build and source lint now.
</details>

Done. When users select **Machines** under equipment in [Onboarding.tsx](./adaptfit-app/src/pages/Onboarding.tsx), a machine detail section now appears.

It includes:
- Multi-select machine options:
  - Cable machine
  - Leg press
  - Smith machine
  - Lat pulldown
  - Chest press
  - Leg curl / extension
- An “Other machines” input for custom entries like hack squat, pec deck, row machine, etc.
- If Machines is deselected, the machine-specific answers are cleared.

Also updated [onboarding-service.ts](./adaptfit-app/src/api/onboarding-service.ts) so the payload includes `machineTypes` and `customMachines`.

Checks passed:
- `npm run build`
- `npx eslint src`

