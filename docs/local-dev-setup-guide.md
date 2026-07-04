## Local Development Setup

These instructions run AdaptFit locally with:

- React/Vite frontend in `adaptfit-app`
- Express REST API backend in `adaptfit-api`
- Local PostgreSQL database
- Sequelize ORM in the backend, using PostgreSQL as its database dialect
- Google OAuth login with backend-verified sessions

Sequelize is the backend database access layer. PostgreSQL is still the database server, and the SQL migrations remain the source of truth for the schema.

### 1. Install prerequisites

Install:

- Node.js 18 or newer and npm
- PostgreSQL
- Git

On Windows, install PostgreSQL from the official installer. During installation, remember:

- the password you set for the default `postgres` user
- the port, usually `5432`

Make sure PostgreSQL is running. On Windows, it normally runs as a service after installation. You can also open **Services** and look for a service named something like `postgresql-x64-*`.

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

Press Enter for the defaults and enter the password you created during PostgreSQL installation.

Create the database:

```sql
create database adaptfit;
```

Optional but recommended: create a dedicated database user for the app instead of using the default `postgres` user.

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
```

If you created the optional `adaptfit_user`, use that account in `DATABASE_URL` instead:

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

`GOOGLE_CLIENT_ID` should be the same Google OAuth client ID used by the frontend.

`CLIENT_ORIGIN` should match the frontend dev server origin. Vite normally runs at:

```text
http://localhost:5173
```

`SESSION_COOKIE_NAME` can be any valid cookie name, but it must be consistent because the backend uses it when setting, reading, and clearing the session cookie. Use:

```env
SESSION_COOKIE_NAME=adaptfit_session
```

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

In Google Cloud Console, make sure your OAuth client has this authorized JavaScript origin:

```text
http://localhost:5173
```

For this Google Identity Services flow, the frontend receives the Google credential and sends it to the backend. The backend verifies it using `GOOGLE_CLIENT_ID`.

### 6. Install backend dependencies

From the project root:

```bash
cd adaptfit-api
npm install
```

### 7. Run database migrations

Still inside `adaptfit-api`, run:

```bash
npm run migrate
```

This runs the SQL files in:

```text
adaptfit-api/migrations/
```

Current migrations:

```text
001_create_users.sql
002_create_sessions.sql
```

They create:

- `users`: stores AdaptFit user records linked to Google by `google_sub`
- `sessions`: stores hashed app session tokens connected to users

The backend reads and writes these tables through Sequelize models while keeping
PostgreSQL as the database.

The migration runner also uses Sequelize:

```text
scripts/run-migrations.js -> sequelize.query(sql)
```

The app does not use `sequelize.sync()` to create or alter tables at startup. Keep schema changes in SQL migration files so PostgreSQL-specific details such as `pgcrypto`, indexes, foreign keys, and triggers remain explicit.

You can verify the tables in `psql`:

```sql
\c adaptfit
\dt
```

Expected tables:

```text
users
sessions
```

### 8. Start the backend

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

### 9. Install frontend dependencies

Open another terminal from the project root:

```bash
cd adaptfit-app
npm install
```

### 10. Start the frontend

From `adaptfit-app`:

```bash
npm run dev
```

The frontend should run at:

```text
http://localhost:5173
```

### 11. Test the login flow

With both servers running:

1. Open `http://localhost:5173`.
2. Click `Log in`.
3. Complete Google login.
4. The frontend sends the Google credential to `POST /auth/google`.
5. The backend verifies the token with Google.
6. The backend creates or updates the user through Sequelize in PostgreSQL.
7. The backend creates a session through Sequelize and sends an HttpOnly cookie.
8. The frontend redirects to the dashboard.
9. The navbar should show `Hi, firstName!`.

After logging in, refresh the page. The app should stay logged in because `App.tsx` calls `/auth/me`, and the browser sends the session cookie to the backend.

### 12. Test logout

Click `Log out`.

The frontend calls:

```text
POST /auth/logout
```

The backend:

1. Reads the session cookie.
2. Hashes the raw session token.
3. Deletes the matching row from `sessions` through Sequelize.
4. Clears the cookie.

The navbar should return to `Log in`.

### Useful commands

Backend:

```bash
cd adaptfit-api
npm install
npm run migrate
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
- `DATABASE_URL` has the correct username, password, host, port, and database name.
- The database user has privileges on the database and `public` schema.
- `adaptfit-api/datasource.js` is using `dialect: "postgres"`.
- `npm install` has installed both `sequelize` and `pg`.

If Google login fails, check:

- `VITE_OAUTH_CLIENT_ID` is set in `adaptfit-app/.env`.
- `GOOGLE_CLIENT_ID` is set in `adaptfit-api/.env`.
- The two client IDs match.
- Google Cloud Console includes `http://localhost:5173` as an authorized JavaScript origin.

If login succeeds but refresh logs you out, check:

- `VITE_API_BASE_URL=http://localhost:3000`.
- `CLIENT_ORIGIN=http://localhost:5173`.
- Frontend API calls use `credentials: "include"`.
- Backend CORS uses `credentials: true`.
- `SESSION_COOKIE_NAME` is consistent.
- The `sessions` table has a non-expired session row.
