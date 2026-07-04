# AdaptFit API

Minimal Express REST API for AdaptFit authentication. The API uses Sequelize as
its ORM/query layer and PostgreSQL as the database.

## Setup

Requires Node.js 18 or newer.

```bash
npm install
cp .env.example .env
npm run start:dev
```

Fill in `.env` before starting the server.

Required values:

- `DATABASE_URL`: Postgres connection string.
- `GOOGLE_CLIENT_ID`: same Google OAuth client ID used by the Vite frontend.
- `CLIENT_ORIGIN`: frontend origin, usually `http://localhost:5173` in development.

On startup, the API calls `sequelize.sync({ alter: { drop: false } })`, matching
the Lab6 Sequelize startup pattern while keeping PostgreSQL as the database.
This creates the `users` and `sessions` tables if they do not already exist and
can apply non-dropping table changes during local development.

## Auth Routes

- `POST /auth/google`: verifies a Google ID token, upserts a user, and sets an app session cookie.
- `GET /auth/me`: returns the current session user.
- `POST /auth/logout`: deletes the current app session.
