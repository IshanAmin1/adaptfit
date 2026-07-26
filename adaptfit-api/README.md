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
- `GOOGLE_CLIENT_ID`: same Google OAuth client ID used by the Vite frontend.
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

- `POST /auth/google`: verifies a Google ID token, upserts a user, and sets an
  app session cookie.
- `GET /auth/me`: returns the current session user.
- `POST /auth/logout`: deletes the current app session.
