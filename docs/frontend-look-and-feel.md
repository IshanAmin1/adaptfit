# AdaptFit Frontend Look and Feel

This document gives a short overview of how the AdaptFit frontend is structured and how the main mockups connect to the current React app. It is meant as quick interview prep for teammates.

## Main Frontend Flow

The frontend app lives in `adaptfit-app` and is built with React, TypeScript, Vite, React Router, Tailwind CSS classes, and Google OAuth.

The main routes are controlled in `src/App.tsx`:

- `/` shows the public landing page.
- `/login` shows the Google login page.
- `/dashboard` shows the dashboard after authentication.

When the app loads, it calls `getCurrentUser()` from `adaptfit-app/src/api/auth.ts` to check if the user already has a valid session. The dashboard is wrapped in `RequireAuth`, so users who are not logged in are redirected to `/login`.

## Visual Style

The design is clean, modern, and fitness-dashboard focused. It uses:

- A soft white and green background gradient.
- Dark text for strong contrast.
- Green as the main brand/accent color.
- Rounded cards with light borders and subtle shadows.
- Large bold headings for workout and dashboard information.
- Compact uppercase labels for sections like "AI Insights", "Nutrition", and "Progress".

Most styling is written directly with Tailwind utility classes inside the React components. The global background, font family, and page-level styling are mainly set in `App.tsx` and `src/index.css`.

## Main Components

`Navbar.tsx`

The top navigation is fixed at the top of the screen. It shows the AdaptFit brand, dashboard section links, and either a login button or logout controls depending on whether the user is authenticated.

`Landing.tsx`

The landing page is intentionally minimal. It introduces AdaptFit, explains that the app organizes workouts, nutrition, progress, and AI insights, and includes a subscription call-to-action section.

`Login.tsx`

The login page uses a two-column layout on larger screens. One side contains the sign-in message and Google login button, while the other side shows a dashboard preview image. On successful Google login, the user is sent to `/dashboard`.

`Dashboard.tsx`

The dashboard arranges the main feature cards in a responsive grid. It imports and displays:

- `WorkoutPlanCard`
- `InsightsCard`
- `NutritionCard`
- `ProgressCard`

## Dashboard Cards

`WorkoutPlanCard`

Shows the main AI-generated workout plan for the day, including completion percentage, estimated time, intensity, input data, exercise steps, and a start workout button.

`InsightsCard`

Shows AI-based plan adjustments, such as increasing intensity or suggesting exercise alternatives.

`NutritionCard`

Shows daily calorie and macro targets using progress bars. It also includes a meal logging action.

`ProgressCard`

Shows weekly progress using a simple line chart and a percentage improvement indicator.

## Shared UI Pieces

The `src/components/common` folder contains reusable dashboard UI elements:

- `DashboardCard` gives cards the shared border, background, radius, and shadow.
- `SectionHeading` standardizes card headings and optional right-side actions.
- `ProgressBar` displays nutrition progress.
- `StatTile` displays small metric blocks.
- `WorkoutStep` displays individual workout exercises.

These common components keep the dashboard consistent and make it easier to update the design in one place.

## How the Mockups Work

The `mockups` folder contains a static HTML/CSS version of the dashboard design:

- `mockups/index.html` defines the dashboard layout and sample content.
- `mockups/main.css` defines the colors, grid layout, cards, progress bars, buttons, and chart styling.

The mockup was used as the visual reference for the React implementation. The React app follows the same structure but breaks it into components. For example, the mockup's main dashboard card became `WorkoutPlanCard`, the nutrition section became `NutritionCard`, and repeated visual patterns became shared components like `DashboardCard` and `ProgressBar`.

In short: the mockup shows the design idea, while the React app turns that design into reusable, routed, authenticated frontend screens.

## Summary

AdaptFit's frontend is a React/Vite single-page app. The app starts with a public landing page, lets users sign in with Google, then protects the dashboard behind authentication. The look and feel comes from a clean green-and-white fitness dashboard style, with reusable card components for workout plans, AI insights, nutrition, and progress. The static mockups provide the original visual design, and the React components are the working version of that design.
