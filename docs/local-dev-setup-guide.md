## Local Development Setup

These instructions run AdaptFit locally with:

- React/Vite frontend in `adaptfit-app`
- Express REST API backend in `adaptfit-api`
- Local PostgreSQL database
- Sequelize ORM for AdaptFit application records
- `express-session` for app sessions
- `connect-pg-simple` for storing Express sessions in PostgreSQL
- Google OAuth login with backend-verified Google ID tokens
- Stripe Checkout and Customer Portal for monthly subscription billing
- Stripe webhooks for syncing subscription state

Sequelize is still the backend database access layer for application models. In
the current implementation, Sequelize defines and syncs the `users`,
`onboarding_profiles`, and `subscriptions` tables. Model definitions live in
`adaptfit-api/models`, associations are centralized in
`adaptfit-api/models/index.js`, and model persistence helpers live in
`adaptfit-api/utils/models`. Express session data is not represented by a
Sequelize model anymore. `connect-pg-simple` creates and uses its own
PostgreSQL `session` table.

On backend startup:

1. `sessionMiddleware()` configures `express-session` with a Postgres-backed
   store.
2. `sequelize.authenticate()` verifies the database connection.
3. In non-production environments, `sequelize.sync({ alter: { drop: false } })`
   creates or updates the Sequelize-managed `users`, `onboarding_profiles`, and
   `subscriptions` tables.
4. `connect-pg-simple` creates the `session` table if it is missing when the
   session store is used.

### 1. Install prerequisites

Install:

- Node.js 18 or newer and npm
- Docker Desktop, recommended for local PostgreSQL and Redis
- PostgreSQL, only if you prefer installing/running it directly instead of
  Docker
- Git
- Stripe CLI, for local webhook forwarding

If you use Docker, you do not need to install PostgreSQL directly for local
development. The repo includes a Compose file that starts PostgreSQL and Redis.

If you prefer not to use Docker, install PostgreSQL from the official installer.
On Windows, during installation, remember:

- the password you set for the default `postgres` user
- the port, usually `5432`

Make sure PostgreSQL is running if you installed it directly. On Windows, it
normally runs as a service after installation. You can also open **Services**
and look for a service named something like `postgresql-x64-*`.

### 2. Create the local PostgreSQL database

#### Recommended Docker setup:

```bash
cd adaptfit-api
npm run start:dev-docker
```

This starts:

- PostgreSQL on host port `5433`
- Redis on host port `6381`

Use this database URL with the Docker setup:

```env
DATABASE_URL=postgres://adaptfit_user:adaptfit@localhost:5433/adaptfit
```

Redis defaults already match the Docker Compose file:

```env
REDIS_HOST=localhost
REDIS_PORT=6381
```

The Docker PostgreSQL container creates the `adaptfit` database and
`adaptfit_user` user automatically from `adaptfit-api/docker-compose.yml`.

#### Manual PostgreSQL setup:

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
STRIPE_SECRET_KEY=sk_test_replace_with_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_replace_after_running_stripe_listen
STRIPE_MONTHLY_PRICE_ID=price_replace_with_your_monthly_price_id
```

If you are using the Docker Compose setup from step 2, use this instead:

```env
DATABASE_URL=postgres://adaptfit_user:adaptfit@localhost:5433/adaptfit
REDIS_HOST=localhost
REDIS_PORT=6381
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

`STRIPE_SECRET_KEY` is the backend-only Stripe secret key. Use a test-mode
`sk_test_...` key for local development.

`STRIPE_MONTHLY_PRICE_ID` is the recurring monthly Stripe Price ID sold through
Checkout. It should look like `price_...`.

`STRIPE_WEBHOOK_SECRET` verifies incoming Stripe webhook requests. For local
development, this value comes from `stripe listen`, not from the Stripe
Dashboard. See the Stripe section below.

The frontend does not need a Stripe public key for the current implementation
because users are redirected to Stripe-hosted Checkout and Stripe-hosted
Customer Portal from backend-created sessions.

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

### 6. Configure Stripe for local development

In the Stripe Dashboard, use test mode and create:

1. A Product, such as `AdaptFit Monthly`.
2. A recurring monthly Price for that product.

Copy the Price ID into `adaptfit-api/.env`:

```env
STRIPE_MONTHLY_PRICE_ID=price_...
```

Also copy your test secret key into `adaptfit-api/.env`:

```env
STRIPE_SECRET_KEY=sk_test_...
```

Enable/configure the Stripe Customer Portal in the Stripe Dashboard. AdaptFit
uses it for payment-method updates and subscription cancellation.

For local webhooks, install and log in to the Stripe CLI, then run this in a
separate terminal while the backend is running:

```bash
stripe listen --events checkout.session.completed,customer.subscription.created,customer.subscription.updated,customer.subscription.deleted,invoice.paid,invoice.payment_failed --forward-to localhost:3000/stripe/webhook
```

The Stripe CLI prints a webhook signing secret:

```text
whsec_...
```

Copy that value into `adaptfit-api/.env`:

```env
STRIPE_WEBHOOK_SECRET=whsec_...
```

Restart the backend after changing `.env`.

Keep the `stripe listen` terminal open while testing local Checkout and
subscription cancellation. If you close it, Stripe events will not reach your
local backend. If you restart `stripe listen`, copy the newly printed
`whsec_...` value into `.env` and restart the backend again.

### 7. Install backend dependencies

From the project root:

```bash
cd adaptfit-api
npm install
```

The backend dependencies include:

- `google-auth-library`: verifies Google ID tokens on the server
- `express-session`: creates and reads app sessions through `req.session`
- `connect-pg-simple`: stores Express session data in PostgreSQL
- `sequelize` and `pg`: connect to PostgreSQL and manage AdaptFit models
- `stripe`: creates Checkout/Customer Portal sessions and verifies webhook
  events

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

When the backend starts locally, it connects to PostgreSQL and runs
`sequelize.sync({ alter: { drop: false } })` because `NODE_ENV` is not
`production`. That creates or updates the Sequelize-managed `users`,
`onboarding_profiles`, and `subscriptions` tables.

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
onboarding_profiles
subscriptions
session
```

The `users` table stores AdaptFit user records linked to Google by
`google_sub`.

The `onboarding_profiles` table stores completed onboarding details for a user,
including goals, equipment, training preferences, dietary preferences, and the
raw submitted profile JSON.

The `session` table is owned by `connect-pg-simple`. It stores serialized
Express session data, including the `userId` set during login. It is not the old
custom `sessions` table with hashed session tokens.

The `subscriptions` table stores Stripe customer/subscription IDs, subscription
status, billing-period dates, cancellation dates, and the Stripe price/product
IDs used for membership access.

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

### 11. Test the login and subscription flow

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
11. If the user does not have an active subscription, the frontend redirects to
    `/subscribe`.
12. Click `Subscribe monthly`.
13. The backend creates a Stripe Checkout Session.
14. Complete Checkout with a Stripe test card, for example:

```text
4242 4242 4242 4242
```

15. Stripe redirects back to AdaptFit.
16. Stripe sends webhook events to the local backend through `stripe listen`.
17. The backend updates the `subscriptions` table.
18. The frontend unlocks `/dashboard` when `/auth/me` returns
    `hasActiveSubscription: true`.

After logging in, refresh the page. The app should stay logged in because
`App.tsx` calls `/auth/me`, and the browser sends the session cookie to the
backend with `credentials: "include"`.

Subscribed users can open `Manage membership` from the navbar. That page shows
membership status and billing-period dates from AdaptFit's own UI. The
`Open billing portal` button opens Stripe Customer Portal for payment-method
changes and cancellation.

### 12. Test cancellation

With `stripe listen` still running:

1. Open `Manage membership`.
2. Click `Open billing portal`.
3. Cancel the subscription in Stripe Customer Portal.
4. Return to AdaptFit.
5. Open `Manage membership` again.

The membership page automatically calls `POST /billing/sync`, which syncs the
customer's subscription state from Stripe and refreshes the displayed
membership state.

If cancellation is scheduled for the end of the billing period, the subscription
can still have:

```text
status = active
cancel_at = future timestamp
```

In that state, dashboard access remains allowed until Stripe ends the
subscription. If the subscription is canceled immediately, Stripe should return:

```text
status = canceled
ended_at = timestamp
```

### 13. Test logout

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

Docker services for local PostgreSQL and Redis:

```bash
cd adaptfit-api
npm run start:dev-docker
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

Stripe webhook forwarding:

```bash
stripe listen --events checkout.session.completed,customer.subscription.created,customer.subscription.updated,customer.subscription.deleted,invoice.paid,invoice.payment_failed --forward-to localhost:3000/stripe/webhook
```

### Common setup issues

If the backend cannot connect to the database, check:

- PostgreSQL service is running.
- The database `adaptfit` exists.
- `DATABASE_URL` has the correct username, password, host, port, and database
  name.
- The database user has privileges on the database and `public` schema.
- `adaptfit-api/datasource.js` is using `dialect: "postgres"`.
- `npm install` has installed `sequelize`, `pg`, `express-session`,
  `connect-pg-simple`, and `stripe`.

If the backend exits with `SESSION_SECRET is not configured.`, check:

- `SESSION_SECRET` exists in `adaptfit-api/.env`.
- The backend was restarted after editing `.env`.

If Google login fails, check:

- `VITE_OAUTH_CLIENT_ID` is set in `adaptfit-app/.env`.
- `GOOGLE_CLIENT_ID` is set in `adaptfit-api/.env`.
- The two client IDs match.
- Google Cloud Console includes `http://localhost:5173` as an authorized
  JavaScript origin.

If subscription checkout fails, check:

- `STRIPE_SECRET_KEY` exists in `adaptfit-api/.env`.
- `STRIPE_MONTHLY_PRICE_ID` exists and points to a recurring monthly test-mode
  Price.
- The backend was restarted after editing `.env`.
- The user is logged in before trying to subscribe.
- Stripe Customer Portal is configured if the billing portal route fails.

If payment succeeds but the membership page stays pending or unpaid, check:

- `stripe listen` is still running.
- `STRIPE_WEBHOOK_SECRET` matches the current `whsec_...` printed by
  `stripe listen`.
- The backend was restarted after updating `STRIPE_WEBHOOK_SECRET`.
- The `stripe listen` terminal shows `POST /stripe/webhook [200]`.
- The `subscriptions` table has a row with `status = active`.
- Opening `/subscribe` triggers `POST /billing/sync`, which can sync missed local
  webhook state from Stripe.

If login succeeds but refresh logs you out, check:

- `VITE_API_BASE_URL=http://localhost:3000`.
- `CLIENT_ORIGIN=http://localhost:5173`.
- Frontend API calls use `credentials: "include"`.
- Backend CORS uses `credentials: true`.
- `SESSION_COOKIE_NAME` matches the cookie in the browser.
- The `session` table exists.
- The `session` table has a non-expired session row.
- `req.session.userId` is being set in `POST /auth/google`.
