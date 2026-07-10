# AdaptFit API

Minimal Express REST API for AdaptFit authentication. The API uses Sequelize as
its ORM/query layer and PostgreSQL as the database.

## Setup

Requires Node.js 18 or newer.

Fill in `.env` before starting the server.

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

On startup, the API calls `sequelize.sync({ alter: { drop: false } })`, matching
the Lab6 Sequelize startup pattern while keeping PostgreSQL as the database.
This creates the `users` table if it does not already exist and can apply
non-dropping table changes during local development. Express session data is
stored in PostgreSQL by `connect-pg-simple`.

## Auth Routes

- `POST /auth/google`: verifies a Google ID token, upserts a user, and sets an
  app session cookie.
- `GET /auth/me`: returns the current session user.
- `POST /auth/logout`: deletes the current app session.
