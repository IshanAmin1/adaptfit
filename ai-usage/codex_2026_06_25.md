# Plan React Vite implementation

> GIve me actionable plan to implement a React- Vite application using the mockups, tel,ll me what components I need what files, and how to setup step by step/.

<details><summary>6 previous messages</summary>

> I’ll take a quick look at the app structure so the plan matches what you already have instead of inventing a parallel universe.
>
> <details><summary>Ran 3 commands</summary>
>
> - Ran `Get-ChildItem -Force`
> - Ran `Get-ChildItem -Recurse -Depth 2 adaptfit-app | Select-Object FullName, PSIsContainer`
> - Ran `Get-Content adaptfit-app\src\components\WorkoutPlanCard.jsx`
>
> </details>
>
> The mockup is a static HTML/CSS pair, so the clean path is to preserve its visual language, split its sections into React components, and keep the CSS centralized until the app grows enough to justify per-component CSS.
>
> <details><summary>Ran 3 commands</summary>
>
> - Ran `Get-Content mockups\index.html`
> - Ran `Get-Content mockups\main.css`
> - Ran `Get-Content adaptfit-app\src\index.css`
>
> </details>
</details>

Here’s the actionable implementation plan for your React + Vite AdaptFit app based on the existing mockups.

**Recommended File Structure**

```txt
adaptfit-app/
  src/
    App.jsx
    main.jsx
    index.css

    components/
      Navbar.jsx
      Dashboard.jsx
      WorkoutPlanCard.jsx
      InsightsCard.jsx
      NutritionCard.jsx
      ProgressCard.jsx
      StatBox.jsx
      ProgressBar.jsx
      ExerciseCard.jsx

    pages/
      DashboardPage.jsx
      Login.jsx
      WorkoutPage.jsx
      NutritionPage.jsx
      ProgressPage.jsx

    data/
      dashboardData.js
      workouts.js
      nutrition.js

    utils/
      formatters.js
```

**Components You Need**

1. `Navbar.jsx`
   Top fixed navigation. Links to dashboard sections or routes.

2. `Dashboard.jsx`
   Main grid layout. Renders the dashboard cards.

3. `WorkoutPlanCard.jsx`
   Today’s AI workout plan. Should eventually receive workout data as props.

4. `ExerciseCard.jsx`
   Reusable card for each exercise inside the workout plan.

5. `StatBox.jsx`
   Reusable stat item for “Estimated Time”, “Intensity”, etc.

6. `InsightsCard.jsx`
   AI recommendations and plan calibration.

7. `NutritionCard.jsx`
   Calories and macro targets.

8. `ProgressBar.jsx`
   Reusable progress bar for calories, protein, carbs, fat.

9. `ProgressCard.jsx`
   Weekly performance chart.

10. `Login.jsx`
   Login form page.

11. Later: `WorkoutPage.jsx`, `NutritionPage.jsx`, `ProgressPage.jsx`
   Full pages if you want navigation beyond the dashboard cards.

**Step-by-Step Setup**

1. Go into the app folder:

```bash
cd adaptfit-app
```

2. Install dependencies if needed:

```bash
npm install
```

3. Start the dev server:

```bash
npm run dev
```

4. Keep the current mockup CSS in `src/index.css` for now. It already matches `mockups/main.css` closely.

5. Split repeated UI into smaller components:

- Move stat boxes from `WorkoutPlanCard.jsx` into `StatBox.jsx`
- Move exercise items into `ExerciseCard.jsx`
- Move nutrition progress bars into `ProgressBar.jsx`

6. Create mock data files:

```txt
src/data/dashboardData.js
```

Example:

```js
export const todayWorkout = {
  title: 'Upper Body Strength',
  completion: 25,
  estimatedTime: '48 min',
  intensity: 'Moderate',
  generatedFrom: 'Goals, equipment, experience, diet',
  exercises: [
    { name: 'Dumbbell bench press', detail: '4 sets x 8 reps' },
    { name: 'One-arm row', detail: '4 sets x 10 reps' },
    { name: 'Shoulder press', detail: '3 sets x 9 reps' },
  ],
};
```

7. Pass data into components using props instead of hardcoding everything.

For example:

```jsx
<WorkoutPlanCard workout={todayWorkout} />
```

8. Add routes in `App.jsx`:

```jsx
<Route path="/" element={<Dashboard />} />
<Route path="/login" element={<Login />} />
<Route path="/workout" element={<WorkoutPage />} />
<Route path="/nutrition" element={<NutritionPage />} />
<Route path="/progress" element={<ProgressPage />} />
```

9. Update `Navbar.jsx` so the nav can use `Link` or `NavLink` from `react-router-dom`.

10. Add responsive CSS. Your current layout is desktop-first. Add media queries for tablets and phones:

```css
@media (max-width: 900px) {
  .app-grid {
    width: min(100% - 32px, 720px);
    grid-template-columns: 1fr;
  }

  .workout-plan-card,
  .insights-card,
  .nutrition-card,
  .progress-card {
    grid-column: span 1;
  }

  .stat-grid,
  .exercise-strip,
  .macro-grid {
    grid-template-columns: 1fr;
  }

  h1 {
    font-size: 40px;
  }
}
```

**Implementation Order**

1. Finish `Navbar.jsx`
2. Finish the four dashboard cards
3. Extract reusable components: `StatBox`, `ExerciseCard`, `ProgressBar`
4. Move hardcoded values into `src/data/dashboardData.js`
5. Add routing for dashboard/login/future pages
6. Add responsive styles
7. Run:

```bash
npm run lint
npm run build
```

The best next move is to refactor your existing dashboard cards into reusable components and data-driven props. That will make the app feel much more like a real React project instead of a static mockup wearing a React hat.
