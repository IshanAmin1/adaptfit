## Local Development Setup

These instructions run AdaptFit locally with:

- React/Vite frontend in `adaptfit-app`
- Express REST API backend in `adaptfit-api`
- Local PostgreSQL database
- Sequelize ORM for AdaptFit user records
- `express-session` for app sessions
- `connect-pg-simple` for storing Express sessions in PostgreSQL
- Google OAuth login with backend-verified Google ID tokens

Sequelize is still the backend database access layer for application models. In
the current auth implementation, Sequelize defines and syncs the `users` table.
Express session data is not represented by a Sequelize model anymore.
`connect-pg-simple` creates and uses its own PostgreSQL `session` table.

On backend startup:

1. `sessionMiddleware()` configures `express-session` with a Postgres-backed
   store.
2. `sequelize.authenticate()` verifies the database connection.
3. In non-production environments, `sequelize.sync({ alter: { drop: false } })`
   creates or updates the Sequelize-managed `users` table.
4. `connect-pg-simple` creates the `session` table if it is missing when the
   session store is used.

### 1. Install prerequisites

Install:

- Node.js 18 or newer and npm
- PostgreSQL
- Git

On Windows, install PostgreSQL from the official installer. During installation,
remember:

- the password you set for the default `postgres` user
- the port, usually `5432`

Make sure PostgreSQL is running. On Windows, it normally runs as a service after
installation. You can also open **Services** and look for a service named
something like `postgresql-x64-*`.

### 2. Create the local PostgreSQL database

Open **SQL Shell (psql)** from the Start Menu.

When prompted, the defaults are usually fine:

```text
Server [localhost]:
Database [postgres]:
Port [5432]:
Username [postgres]:
Password for user postgres:
```

Press Enter for the defaults and enter the password you created during
PostgreSQL installation.

Create the database:

```sql
create database adaptfit;
```

Optional but recommended: create a dedicated database user for the app instead
of using the default `postgres` user.

```sql
create user adaptfit_user with password 'replace_with_a_password';
grant all privileges on database adaptfit to adaptfit_user;
```

Connect to the new database:

```sql
\c adaptfit
```

If you created `adaptfit_user`, grant schema privileges:

```sql
grant all on schema public to adaptfit_user;
```

You can quit `psql` with:

```sql
\q
```

### 3. Configure the backend environment

Create this file:

```text
adaptfit-api/.env
```

Use this template:

```env
PORT=3000
DATABASE_URL=postgres://postgres:your_postgres_password@localhost:5432/adaptfit
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
CLIENT_ORIGIN=http://localhost:5173
SESSION_COOKIE_NAME=adaptfit_session
SESSION_DAYS=7
SESSION_SECRET=replace_with_a_long_random_secret
```

If you created the optional `adaptfit_user`, use that account in `DATABASE_URL`
instead:

```env
DATABASE_URL=postgres://adaptfit_user:replace_with_a_password@localhost:5432/adaptfit
```

`DATABASE_URL` format:

```text
postgres://USERNAME:PASSWORD@HOST:PORT/DATABASE_NAME
```

For a normal local PostgreSQL install:

- `HOST` is `localhost`
- `PORT` is usually `5432`
- `DATABASE_NAME` is `adaptfit`

`GOOGLE_CLIENT_ID` should be the same Google OAuth client ID used by the
frontend.

`CLIENT_ORIGIN` should match the frontend dev server origin. Vite normally runs
at:

```text
http://localhost:5173
```

`SESSION_COOKIE_NAME` is the browser cookie name used by `express-session`.
The default in the app is:

```env
SESSION_COOKIE_NAME=adaptfit_session
```

`SESSION_DAYS` controls the session cookie lifetime. The app turns this into the
cookie `maxAge` in milliseconds.

`SESSION_SECRET` signs the Express session cookie. It is required. Use a long,
unguessable value in real environments.

### 4. Configure the frontend environment

Create this file:

```text
adaptfit-app/.env
```

Use this template:

```env
VITE_OAUTH_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
VITE_API_BASE_URL=http://localhost:3000
```

Vite only exposes frontend environment variables that start with `VITE_`.

`VITE_OAUTH_CLIENT_ID` is public browser configuration. It is not a secret.

`VITE_API_BASE_URL` tells the React app where the Express backend is running.

### 5. Configure Google OAuth for local development

In Google Cloud Console, make sure your OAuth client has this authorized
JavaScript origin:

```text
http://localhost:5173
```

For this Google Identity Services flow, the frontend receives the Google
credential and sends it to the backend. The backend verifies it using
`GOOGLE_CLIENT_ID`.

### 6. Install backend dependencies

From the project root:

```bash
cd adaptfit-api
npm install
```

The backend auth-related dependencies include:

- `google-auth-library`: verifies Google ID tokens on the server
- `express-session`: creates and reads app sessions through `req.session`
- `connect-pg-simple`: stores Express session data in PostgreSQL
- `sequelize` and `pg`: connect to PostgreSQL and manage AdaptFit models

### 7. Start the backend

From `adaptfit-api`:

```bash
npm run start:dev
```

The backend should run at:

```text
http://localhost:3000
```

Health check:

```text
http://localhost:3000/api/health
```

Expected response:

```json
{ "status": "ok" }
```

When the backend starts locally, it connects to PostgreSQL and runs
`sequelize.sync({ alter: { drop: false } })` because `NODE_ENV` is not
`production`. That creates or updates the Sequelize-managed `users` table.

In production, the backend skips `sequelize.sync(...)`; production schema
changes should be handled by migrations or deployment-time database management.

The session middleware also configures `connect-pg-simple` with:

```js
store: new PgSession({
  pool: sessionPool,
  tableName: "session",
  createTableIfMissing: true,
}),
```

That creates the Express session store table if needed.

You can verify tables in `psql`:

```sql
\c adaptfit
\dt
```

Expected auth-related tables:

```text
users
session
```

The `users` table stores AdaptFit user records linked to Google by
`google_sub`.

The `session` table is owned by `connect-pg-simple`. It stores serialized
Express session data, including the `userId` set during login. It is not the old
custom `sessions` table with hashed session tokens.

### 8. Install frontend dependencies

Open another terminal from the project root:

```bash
cd adaptfit-app
npm install
```

### 9. Start the frontend

From `adaptfit-app`:

```bash
npm run dev
```

The frontend should run at:

```text
http://localhost:5173
```

### 10. Test the login flow

With both servers running:

1. Open `http://localhost:5173`.
2. Click `Log in`.
3. Complete Google login.
4. The frontend sends the Google credential to `POST /auth/google`.
5. The backend verifies the token with Google.
6. The backend creates or updates the user through Sequelize in PostgreSQL.
7. The backend regenerates the Express session.
8. The backend stores `req.session.userId = user.id`.
9. `express-session` sends an HttpOnly `adaptfit_session` cookie.
10. `connect-pg-simple` stores the session in PostgreSQL.
11. The frontend redirects to the dashboard.
12. The navbar should show `Hi, firstName!`.

After logging in, refresh the page. The app should stay logged in because
`App.tsx` calls `/auth/me`, and the browser sends the session cookie to the
backend with `credentials: "include"`.

### 11. Test logout

Click `Log out`.

The frontend calls:

```text
POST /auth/logout
```

The backend:

1. Calls `req.session.destroy(...)`.
2. Lets the Postgres session store delete the server-side session.
3. Clears the session cookie in the browser with `res.clearCookie(COOKIE_NAME)`.

The frontend clears `authUser` from React state, and the navbar should return to
`Log in`.

### Useful commands

Backend:

```bash
cd adaptfit-api
npm install
npm run start:dev
```

Frontend:

```bash
cd adaptfit-app
npm install
npm run dev
```

Frontend production build check:

```bash
cd adaptfit-app
npm run build
```

### Common setup issues

If the backend cannot connect to the database, check:

- PostgreSQL service is running.
- The database `adaptfit` exists.
- `DATABASE_URL` has the correct username, password, host, port, and database
  name.
- The database user has privileges on the database and `public` schema.
- `adaptfit-api/datasource.js` is using `dialect: "postgres"`.
- `npm install` has installed `sequelize`, `pg`, `express-session`, and
  `connect-pg-simple`.

If the backend exits with `SESSION_SECRET is not configured.`, check:

- `SESSION_SECRET` exists in `adaptfit-api/.env`.
- The backend was restarted after editing `.env`.

If Google login fails, check:

- `VITE_OAUTH_CLIENT_ID` is set in `adaptfit-app/.env`.
- `GOOGLE_CLIENT_ID` is set in `adaptfit-api/.env`.
- The two client IDs match.
- Google Cloud Console includes `http://localhost:5173` as an authorized
  JavaScript origin.

If login succeeds but refresh logs you out, check:

- `VITE_API_BASE_URL=http://localhost:3000`.
- `CLIENT_ORIGIN=http://localhost:5173`.
- Frontend API calls use `credentials: "include"`.
- Backend CORS uses `credentials: true`.
- `SESSION_COOKIE_NAME` matches the cookie in the browser.
- The `session` table exists.
- The `session` table has a non-expired session row.
- `req.session.userId` is being set in `POST /auth/google`.
