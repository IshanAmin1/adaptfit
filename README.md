# AdaptFit

AdaptFit is a personalized fitness planning web application. It combines a
guided onboarding assessment with AI-generated workout and nutrition
recommendations, then gives users tools to review their plan, log workouts, and
understand their training targets.

## Features

- Google sign-in with a server-side session and PKCE-protected OAuth flow.
- Subscription checkout and billing management through Stripe.
- Guided onboarding covering:
  - Basic information and body measurements
  - Fitness goals and target timeline
  - Experience level
  - Training location, equipment, machines, available days, and session length
  - Diet type, allergies, foods to avoid, and meal frequency
- AI-assisted plan generation using OpenRouter.
- Personalized weekly workout schedules with:
  - Session type, duration, and exercises
  - Sets, reps, rest periods, and target muscle groups
  - Exercise demonstrations and instructions when available
- Nutrition targets including daily calories and protein, carbohydrate, and fat
  goals.
- Dashboard views for the current plan, nutrition summary, and progress.
- Workout logging with full or partial completion status, completed sets and
  reps, and notes.
- Plan insights showing adaptation rules, training signals, energy targets,
  macro distribution, and muscle-group coverage.
- Live onboarding and plan-generation progress using Server-Sent Events (SSE).
- Validation, rate limiting, security headers, and persistent sessions on the
  API.

## Application flow

1. Sign in with Google.
2. Start a monthly subscription through Stripe.
3. Complete the onboarding assessment.
4. Wait for the queued validation and AI plan-generation steps to finish.
5. Review the generated plan from the dashboard.
6. Log completed workouts and use the plan, progress, and insights views to
   track training.
7. Redo onboarding later when a new plan is needed and the cooldown allows it.

## Tech stack

### Frontend

- React 19 and TypeScript
- Vite
- React Router
- Tailwind CSS
- `@microsoft/fetch-event-source` for SSE updates

### Backend

- Node.js 18+
- Express
- Sequelize
- PostgreSQL
- Redis and BullMQ for background jobs
- Google OAuth
- Stripe Billing and webhooks
- OpenRouter for AI-assisted plan generation
- Exercise DB through RapidAPI for exercise demonstrations

## Project structure

```text
adaptfit-app/       React frontend
adaptfit-api/       Express API and background workers
docs/               Development and feature documentation
mockups/            Static UI mockup
docker-compose-dev.yml
docker-compose-prod.yml
```

## Local development

### Prerequisites

- Node.js 18 or newer
- Docker Desktop
- A PostgreSQL database
- A Redis instance
- Google OAuth credentials
- Stripe test credentials
- OpenRouter API access
- Exercise DB RapidAPI access

### Install dependencies

From the repository root:

```powershell
npm install
```

### Start PostgreSQL and Redis

```powershell
docker compose -f docker-compose-dev.yml up -d
```

The development compose file exposes PostgreSQL on port `5433` and Redis on
port `6381` to avoid conflicts with services already running on the default
ports.

### Configure the API

Create `adaptfit-api/.env` locally. Do not commit this file.

```dotenv
DATABASE_URL=postgres://DB_USER:DB_PASSWORD@localhost:5433/DB_NAME
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
CLIENT_ORIGIN=http://localhost:5173
SESSION_SECRET=generate-a-long-random-secret

STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret
STRIPE_MONTHLY_PRICE_ID=your-stripe-price-id

OPENROUTER_API_KEY=your-openrouter-api-key
EXERCISE_DB_RAPIDAPI_KEY=your-rapidapi-key
EXERCISE_DB_RAPIDAPI_HOST=edb-with-videos-and-images-by-ascendapi.p.rapidapi.com
EXERCISE_DB_BASE_URL=https://edb-with-videos-and-images-by-ascendapi.p.rapidapi.com/api/v1

REDIS_HOST=localhost
REDIS_PORT=6381
```

Create `adaptfit-app/.env.local` for the frontend:

```dotenv
VITE_API_BASE_URL=http://localhost:3000
```

Never place server-only secrets such as `GOOGLE_CLIENT_SECRET`,
`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `OPENROUTER_API_KEY`, or
`SESSION_SECRET` in frontend environment variables.

### Run the application

In separate terminals:

```powershell
cd adaptfit-api
npm run start:dev-server
```

```powershell
cd adaptfit-api
npm run start:dev-worker
```

```powershell
cd adaptfit-app
npm run dev
```

The frontend runs at `http://localhost:5173` and the API runs at
`http://localhost:3000`.

### Stripe webhooks locally

Install the Stripe CLI, sign in, and forward webhook events to the local API:

```powershell
cd adaptfit-api
npm run start:dev-stripe
```

Copy the webhook signing secret printed by the Stripe CLI into
`STRIPE_WEBHOOK_SECRET`.

## Useful commands

From the repository root:

```powershell
npm run format
npm run lint
npm run tidy
```

Frontend commands:

```powershell
cd adaptfit-app
npm run build
npm run preview
```

## API route groups

- `/auth` - Google login, current-user lookup, and logout
- `/billing` - Stripe checkout, subscription status, and billing portal
- `/onboarding` - profile submission, validation, and progress streaming
- `/plans` - generated plan retrieval and plan-generation progress
- `/logging` - workout log creation and retrieval
- `/exercises` - exercise demonstration lookups
- `/stripe/webhook` - Stripe subscription and payment event handling

## Security and configuration

- Keep all `.env` files, private keys, API tokens, and webhook secrets out of
  Git.
- Use Stripe test credentials for local development.
- Use HTTPS and production secrets only in deployment environments.
- Review the documentation in [`docs/`](./docs/) for the local setup, OAuth,
  rate-limiting, authentication, and real-time implementation details.

## License

This project does not currently declare an open-source license.
