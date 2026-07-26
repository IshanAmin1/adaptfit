# AdaptFit API

Minimal Express REST API for AdaptFit authentication. The API uses Sequelize as
its ORM/query layer and PostgreSQL as the database.

## Setup

Requires Node.js 18 or newer.

Fill in `.env` before starting the server.

Example `.env` values:

```bash
DATABASE_URL=postgres://USER:PASSWORD@localhost:5432/adaptfit
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
CLIENT_ORIGIN=http://localhost:5173
SESSION_SECRET=replace-with-a-long-random-secret

EXERCISE_DB_RAPIDAPI_KEY=your-rapidapi-key
EXERCISE_DB_RAPIDAPI_HOST=edb-with-videos-and-images-by-ascendapi.p.rapidapi.com
EXERCISE_DB_BASE_URL=https://edb-with-videos-and-images-by-ascendapi.p.rapidapi.com/api/v1
```

```bash
npm install
npm run start:dev
```

Required values:

- `DATABASE_URL`: Postgres connection string.
- `GOOGLE_CLIENT_ID`: Google OAuth web client ID.
- `GOOGLE_CLIENT_SECRET`: Google OAuth web client secret. This value is used
  only by the API and must not be exposed through Vite/frontend env variables.
- `GOOGLE_REDIRECT_URI`: API callback URL registered in Google Cloud Console.
  Defaults to `http://localhost:3000/auth/google/callback` for local
  development.
- `CLIENT_ORIGIN`: frontend origin, usually `http://localhost:5173` in
  development.
- `SESSION_SECRET`: secret used to sign the Express session cookie.
- `EXERCISE_DB_RAPIDAPI_KEY`: RapidAPI key for Exercise DB video lookups.
  Get this from the RapidAPI playground for
  [EDB with Videos and Images by AscendAPI](https://rapidapi.com/ascendapi/api/edb-with-videos-and-images-by-ascendapi/playground/apiendpoint_d83635c2-6c9f-4db5-9d3d-338f13cca0dd)
  after subscribing/signing in.
- `EXERCISE_DB_RAPIDAPI_HOST`: RapidAPI Exercise DB host. Defaults to
  `edb-with-videos-and-images-by-ascendapi.p.rapidapi.com`.
- `EXERCISE_DB_BASE_URL`: Exercise DB API base URL. Defaults to
  `https://edb-with-videos-and-images-by-ascendapi.p.rapidapi.com/api/v1`.

On startup, the API calls `sequelize.sync({ alter: { drop: false } })`, matching
the Lab6 Sequelize startup pattern while keeping PostgreSQL as the database.
This creates the Sequelize-managed `users`, `onboarding_profiles`, and
`subscriptions` tables if they do not already exist and can apply non-dropping
table changes during local development. Express session data is stored in
PostgreSQL by `connect-pg-simple`.

Model definitions live in `models/*.js`. Associations are registered in
`models/index.js`. Query/serialization helpers that operate on those models
live in `utils/models/*.js`.

## Auth Routes

- `GET /auth/google/start`: creates a Google authorization URL with PKCE,
  stores `state` and the PKCE verifier in the Express session, and redirects the
  browser to Google.
- `GET /auth/google/callback`: validates `state`, exchanges the auth code with
  the server-only Google client secret and PKCE verifier, verifies the returned
  ID token, upserts a user, and sets an app session cookie.
- `GET /auth/me`: returns the current session user.
- `POST /auth/logout`: deletes the current app session.

The Google token is used only to authenticate the user during login. AdaptFit
stores the internal `userId` in the Express session after login and does not
store Google access tokens or request refresh tokens.

## OAuth Deployment Checklist

- Create or update a Google OAuth Web application client.
- Add the deployed API callback URL to Authorized redirect URIs, for example
  `https://api.adaptfit.me/auth/google/callback`.
- Set API env vars: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
  `GOOGLE_REDIRECT_URI`, `CLIENT_ORIGIN`, and `SESSION_SECRET`.
- Set frontend env var `VITE_API_BASE_URL` to the deployed API origin.
- Remove any frontend `VITE_OAUTH_CLIENT_ID` usage; the SPA no longer talks to
  Google directly.
- Use HTTPS in production so session cookies are sent with `secure: true`.
- Deploy the API with a persistent Postgres-backed session table so OAuth
  `state` and PKCE verifier data survive the redirect from Google.
- If the frontend and API are deployed on different sites, revisit session
  cookie `sameSite`/domain settings and CORS credentials before launch.
