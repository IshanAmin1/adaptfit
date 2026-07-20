# Authentication Login Flow

This document explains how login works in AdaptFit from the moment a user clicks
`Log in` to the moment the user is authenticated, stored in PostgreSQL through
Sequelize, given an Express app session, and redirected to the dashboard.

The current implementation is not frontend-only auth. The frontend receives a
Google credential, but the backend verifies that credential and becomes the
source of truth for whether the browser is authenticated.

## High-Level Flow

```text
1. User clicks Log in in the navbar.
2. React routes the user to /login.
3. Login.tsx renders the GoogleLogin button.
4. Google returns a credential response to the frontend.
5. Frontend sends credentialResponse.credential to POST /auth/google.
6. Express backend verifies the Google ID token with Google.
7. Backend creates or updates the user through the Sequelize User model.
8. Backend regenerates the Express session.
9. Backend stores user.id in req.session.userId.
10. express-session signs and sends the app session cookie.
11. connect-pg-simple stores the session data in PostgreSQL.
12. Backend returns the serialized user.
13. Frontend stores the user in React state.
14. Frontend redirects to /dashboard.
15. Navbar renders the authenticated UI.
```

## Why The Flow Is Designed This Way

The old frontend-only version decoded the Google ID token in the browser and
stored a small user object in `localStorage`. That is useful for a mockup, but
it is not enough once the app has protected backend data.

The backend must verify the Google token because:

- `jwtDecode` only parses a token; it does not verify the token signature.
- A user can edit frontend state and browser storage.
- The database needs a trusted app user, not just browser-provided profile data.
- Future routes will need to know which authenticated AdaptFit user is making
  the request.

The backend creates its own Express session because:

- AdaptFit should not depend on frontend state as proof of login.
- The browser can stay logged in after refresh using a cookie.
- `express-session` can load session data into `req.session` on later requests.
- `connect-pg-simple` persists sessions in PostgreSQL instead of the unsafe
  Express memory store.
- Logout can revoke the app session by calling `req.session.destroy(...)`.

## Files Involved

Frontend:

```text
adaptfit-app/src/main.tsx
adaptfit-app/src/App.tsx
adaptfit-app/src/components/Navbar.tsx
adaptfit-app/src/pages/Login.tsx
adaptfit-app/src/api/auth.ts
adaptfit-app/src/types/auth.ts
```

Backend:

```text
adaptfit-api/app.js
adaptfit-api/datasource.js
adaptfit-api/models/index.js
adaptfit-api/models/sessions.js
adaptfit-api/models/users.js
adaptfit-api/utils/models/users.js
adaptfit-api/middleware/auth.js
adaptfit-api/routers/auth_router.js
```

## Required Environment Variables

Frontend `.env`:

```env
VITE_OAUTH_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
VITE_API_BASE_URL=http://localhost:3000
```

Backend `.env`:

```env
PORT=3000
DATABASE_URL=postgres://postgres:your_password@localhost:5432/adaptfit
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
CLIENT_ORIGIN=http://localhost:5173
SESSION_COOKIE_NAME=adaptfit_session
SESSION_DAYS=7
SESSION_SECRET=replace_with_a_long_random_secret
```

`DATABASE_URL` is a PostgreSQL connection string. `adaptfit-api/datasource.js`
passes it to Sequelize with the `postgres` dialect, and Sequelize uses the `pg`
driver underneath.

The frontend and backend both need the Google client ID, but for different
reasons.

The frontend uses `VITE_OAUTH_CLIENT_ID` to render the Google Identity Services
button.

The backend uses `GOOGLE_CLIENT_ID` to verify that the Google ID token was
issued for this exact app.

`SESSION_COOKIE_NAME` controls the cookie name used by `express-session`.
`adaptfit_session` is the local default.

`SESSION_DAYS` controls how long the browser session cookie lasts.

`SESSION_SECRET` is required by `express-session`. It signs the session cookie
so the backend can detect tampering.

## Frontend Root Setup

Google's React components need a provider at the root of the React tree.

`adaptfit-app/src/main.tsx`:

```tsx
import { GoogleOAuthProvider } from "@react-oauth/google";
import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

ReactDOM.createRoot(rootElement).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={import.meta.env.VITE_OAUTH_CLIENT_ID}>
      <App />
    </GoogleOAuthProvider>
  </StrictMode>,
);
```

`GoogleOAuthProvider` gives child components access to Google Identity Services.
Without it, `GoogleLogin` will not have the configured client ID.

The client ID is safe to expose to browser JavaScript. It identifies the app to
Google, but it is not a private secret.

## Step 1: Navbar Sends The User To Login

`adaptfit-app/src/components/Navbar.tsx` receives `authUser` from `App`.

When `authUser` is `null`, the navbar shows the login link:

```tsx
{
  authUser ? (
    <div className="flex items-center gap-3.5">
      <span className="hidden whitespace-nowrap text-sm font-black text-[#17211f] sm:inline">
        Hi, {authUser.firstName}!
      </span>
      <button
        type="button"
        className="rounded-lg bg-[#17211f] px-4.25 py-2.75 font-black text-white"
        onClick={handleLogout}
      >
        Log out
      </button>
    </div>
  ) : (
    <Link
      to={location.pathname === "/login" ? "/" : "/login"}
      className="rounded-lg bg-[#17211f] px-4.25 py-2.75 font-black text-white no-underline"
    >
      {location.pathname === "/login" ? "Home" : "Log in"}
    </Link>
  );
}
```

The login link navigates to `/login`.

The route is defined in `adaptfit-app/src/App.tsx`:

```tsx
<Routes>
  <Route path="/" element={<Landing />} />
  <Route path="/login" element={<Login authUser={authUser} onLogin={handleLogin} />} />
  <Route
    path="/dashboard"
    element={<RequireAuth authChecked={authChecked} authUser={authUser} />}
  />
</Routes>
```

`App` passes `handleLogin` to `Login`, and passes `authChecked` and `authUser`
to `RequireAuth`, because `App` owns the top-level auth state:

```tsx
const [authUser, setAuthUser] = useState<AuthUser | null>(null);

const handleLogin = (user: AuthUser) => {
  setAuthUser(user);
};
```

## Step 2: Login Page Renders Google Login

`adaptfit-app/src/pages/Login.tsx` renders the Google login button:

```tsx
<GoogleLogin
  onSuccess={handleGoogleSuccess}
  onError={handleGoogleError}
  width="320"
/>
```

If Google sign-in succeeds, Google calls `handleGoogleSuccess`.

If Google sign-in fails or is cancelled, Google calls `handleGoogleError`.

The page stores a visible error message in component state:

```tsx
const [errorMessage, setErrorMessage] = useState<string | null>(null);

const handleGoogleError = () => {
  setErrorMessage("Google login failed. Please try again.");
};
```

The visible error is rendered as:

```tsx
{
  errorMessage ? (
    <p className="m-0 text-sm font-semibold text-red-700" role="alert">
      {errorMessage}
    </p>
  ) : null;
}
```

`role="alert"` helps assistive technologies announce the error.

## Step 3: Frontend Receives The Google Credential

When Google login succeeds, the callback receives a `CredentialResponse`.

`adaptfit-app/src/pages/Login.tsx`:

```tsx
const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
  if (!credentialResponse.credential) {
    handleGoogleError();
    return;
  }

  try {
    const user = await loginWithGoogle(credentialResponse.credential);
    onLogin(user);
    navigate("/dashboard", { replace: true });
  } catch {
    handleGoogleError();
  }
};
```

`credentialResponse.credential` is a Google ID token.

The frontend checks that it exists:

```tsx
if (!credentialResponse.credential) {
  handleGoogleError();
  return;
}
```

Then the frontend sends it to the backend:

```tsx
const user = await loginWithGoogle(credentialResponse.credential);
```

The frontend does not decode the token and does not use it as proof of
authentication. That is the backend's job.

## Step 4: Frontend Calls POST /auth/google

`adaptfit-app/src/api/auth.ts` contains the API wrapper:

```ts
import type { AuthUser } from "../types/auth";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

type AuthResponse = {
  user: AuthUser;
};

async function parseAuthResponse(response: Response): Promise<AuthUser> {
  const body = (await response.json()) as AuthResponse;
  return body.user;
}

export async function loginWithGoogle(credential: string): Promise<AuthUser> {
  const response = await fetch(`${API_BASE_URL}/auth/google`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ credential }),
  });

  if (!response.ok) {
    throw new Error("Google login failed");
  }

  return parseAuthResponse(response);
}
```

The request body looks like:

```json
{
  "credential": "google-id-token-from-google"
}
```

The request uses:

```ts
credentials: "include";
```

This is important because the frontend and backend run on different origins in
development:

```text
Frontend: http://localhost:5173
Backend:  http://localhost:3000
```

Different ports mean different origins. `credentials: "include"` tells the
browser to allow cookies on this cross-origin request.

During login, that means the browser is allowed to accept the backend's
`Set-Cookie` response.

During later authenticated requests, that means the browser sends the stored
session cookie back to the backend.

Without `credentials: "include"`, login might appear to work because the
backend returns user JSON, but the browser may not store the session cookie.
After refresh, `/auth/me` would return `401`, and the user would appear logged
out.

## Step 5: Express Accepts JSON And Cookies Across Origins

The backend setup lives in `adaptfit-api/app.js`:

```js
import "dotenv/config";
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import { sequelize } from "./datasource.js";
import { authRouter } from "./routers/auth_router.js";
import { sessionMiddleware } from "./models/sessions.js";

const PORT = process.env.PORT || 3000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

export const app = express();

app.use(
  cors({
    origin: CLIENT_ORIGIN,
    credentials: true,
  }),
);
app.use(bodyParser.json());
app.use(sessionMiddleware());

try {
  await sequelize.authenticate();

  if (process.env.NODE_ENV !== "production") {
    await sequelize.sync({ alter: { drop: false } });
  }

  console.log("Connection has been established successfully.");
} catch (error) {
  console.error("Unable to connect to the database:", error);
  process.exit(1);
}

app.get("/api/health", (req, res) => {
  return res.json({ status: "ok" });
});

app.use("/auth", authRouter);
```

`cors({ origin: CLIENT_ORIGIN, credentials: true })` is the backend half of
cross-origin cookie support.

The frontend says:

```ts
credentials: "include";
```

The backend says:

```js
credentials: true;
```

Both are needed.

`bodyParser.json()` lets Express read the JSON body from `POST /auth/google`.

`app.use(sessionMiddleware())` must run before `app.use("/auth", authRouter)` so
the auth routes can read and write `req.session`.

`app.use("/auth", authRouter)` mounts the auth routes:

```text
POST /auth/google
GET /auth/me
POST /auth/logout
```

## Step 6: Sequelize Connects To PostgreSQL

`adaptfit-api/datasource.js` creates the Sequelize connection:

```js
import "dotenv/config";
import { Sequelize } from "sequelize";

if (!process.env.DATABASE_URL) {
  console.warn(
    "DATABASE_URL is not set. Database calls will fail until it is configured.",
  );
}

export const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: "postgres",
  logging: false,
});
```

Sequelize is used for AdaptFit application tables such as `users`,
`onboarding_profiles`, and `subscriptions`. It is not used for the Express
session table.

The backend startup calls:

```js
await sequelize.authenticate();

if (process.env.NODE_ENV !== "production") {
  await sequelize.sync({ alter: { drop: false } });
}
```

That follows the Lab6 Sequelize startup pattern for local development. In the
current implementation, it creates or updates the Sequelize-managed application
tables outside production. Model definitions live in `adaptfit-api/models`,
associations are registered in `adaptfit-api/models/index.js`, and model
query/serialization helpers live in `adaptfit-api/utils/models`. In production,
schema changes should be handled by migrations or deployment-time database
management instead of `sequelize.sync(...)`.

## Step 7: Express Session Is Stored In PostgreSQL

`adaptfit-api/models/sessions.js` configures `express-session` and
`connect-pg-simple`:

```js
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import pg from "pg";

const PgSession = connectPgSimple(session);
const { Pool } = pg;

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "adaptfit_session";
const SESSION_DAYS = Number(process.env.SESSION_DAYS || 7);
const SESSION_MAX_AGE = SESSION_DAYS * 24 * 60 * 60 * 1000;

const sessionPool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
```

This file does not define a Sequelize model. It creates a Postgres pool for the
session store and gives that pool to `connect-pg-simple`.

Cookie options:

```js
function getBaseCookieOptions() {
  return {
    httpOnly: true, // prevent client-side JavaScript from accessing the cookie
    sameSite: "lax", // prevent CSRF attacks by restricting cross-site cookie sending
    secure: process.env.NODE_ENV === "production", // ensure cookies are only sent over HTTPS in production
    path: "/", // cookie is valid for the entire domain
  };
}

export function getCookieOptions() {
  return {
    ...getBaseCookieOptions(),
    maxAge: SESSION_MAX_AGE,
  };
}
```

`httpOnly: true` means frontend JavaScript cannot read the session cookie. The
browser manages it automatically.

`sameSite: "lax"` reduces CSRF exposure by limiting when cookies are sent from
cross-site contexts.

`secure: process.env.NODE_ENV === "production"` means the cookie is `Secure`
only in production. A secure cookie is sent only over HTTPS. Local development
usually uses plain HTTP, so `secure` must be false locally or the browser may
refuse to store/send the cookie.

`maxAge` makes the browser cookie persist for `SESSION_DAYS`.

The middleware factory:

```js
export function sessionMiddleware() {
  const secret = process.env.SESSION_SECRET;

  if (!secret) {
    throw new Error("SESSION_SECRET is not configured.");
  }

  return session({
    name: COOKIE_NAME,
    secret,
    resave: false,
    saveUninitialized: false,
    store: new PgSession({
      pool: sessionPool,
      tableName: "session",
      createTableIfMissing: true,
    }),
    cookie: getCookieOptions(),
  });
}
```

Important options:

- `name: COOKIE_NAME` names the cookie `adaptfit_session` instead of the default
  `connect.sid`.
- `secret` signs the session cookie.
- `resave: false` avoids saving unchanged sessions on every request.
- `saveUninitialized: false` avoids creating a database session for anonymous
  requests that never write to `req.session`.
- `store: new PgSession(...)` replaces Express's memory store with PostgreSQL.
- `createTableIfMissing: true` lets the session store create the `session` table
  on startup.

The `session` table is managed by `connect-pg-simple`. It has a different shape
from the old custom `sessions` table. The app session data is serialized into
that table, including the `userId` set during login.

## Step 8: Backend Verifies The Google ID Token

The login route is in `adaptfit-api/routers/auth_router.js`.

Setup:

```js
import { OAuth2Client } from "google-auth-library";
import { Router } from "express";
import { isAuthenticated } from "../middleware/auth.js";
import { serializeUser, upsertGoogleUser } from "../utils/models/users.js";

export const authRouter = Router();

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "adaptfit_session";
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
```

The `COOKIE_NAME` constant is used by logout. Login itself does not manually set
the cookie; `express-session` does that after `req.session` changes.

The route starts by validating configuration and input:

```js
authRouter.post("/google", async (req, res) => {
  try {
    if (!process.env.GOOGLE_CLIENT_ID) {
      return res
        .status(500)
        .json({ error: "GOOGLE_CLIENT_ID is not configured." });
    }

    if (!req.body.credential) {
      return res.status(400).json({ error: "Google credential is required." });
    }
```

Then it verifies the Google token:

```js
let payload;
try {
  const ticket = await googleClient.verifyIdToken({
    idToken: req.body.credential,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  payload = ticket.getPayload();
} catch {
  return res.status(401).json({ error: "Invalid Google credential." });
}
```

`verifyIdToken()` checks that the credential is a real Google ID token and that
it was issued for this app's Google client ID.

This is the key reason the backend exists. The frontend can receive a Google
credential, but the backend decides whether it is trustworthy.

The route also requires Google to provide a stable user ID, email, and verified
email:

```js
if (!payload?.sub || !payload.email || !payload.email_verified) {
  return res
    .status(401)
    .json({ error: "Google account could not be verified." });
}
```

`payload.sub` is Google's stable provider user ID. It is better than email as
the long-term link to the Google account because a user's email may change.

## Step 9: Backend Creates Or Updates The User

After Google verification succeeds, the backend upserts the user:

```js
const user = await upsertGoogleUser({
  googleSub: payload.sub,
  email: payload.email,
  emailVerified: payload.email_verified,
  firstName: payload.given_name || null,
  lastName: payload.family_name || null,
  fullName: payload.name || null,
  avatarUrl: payload.picture || null,
});
```

`adaptfit-api/models/users.js` defines the Sequelize model for the `users`
table. `adaptfit-api/utils/models/users.js` contains the upsert helper used by
the auth route. Sequelize creates the table from this model during startup:

```js
const UserModel = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    google_sub: {
      type: DataTypes.TEXT,
      allowNull: false,
      unique: true,
    },
    email: {
      type: DataTypes.TEXT,
      allowNull: false,
      unique: true,
    },
    email_verified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    first_name: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    last_name: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    full_name: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    avatar_url: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "users",
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);
```

The upsert uses the `google_sub` unique field to handle both first-time and
returning logins:

```js
export async function upsertGoogleUser(profile) {
  const [user] = await User.upsert(
    {
      google_sub: profile.googleSub,
      email: profile.email,
      email_verified: profile.emailVerified,
      first_name: profile.firstName,
      last_name: profile.lastName,
      full_name: profile.fullName,
      avatar_url: profile.avatarUrl,
    },
    {
      conflictFields: ["google_sub"],
      returning: true,
    },
  );

  return toPlainUser(user);
}
```

This handles both cases:

- First login: insert a new user.
- Returning login: update profile fields for the existing `google_sub`.

The route does not store Google access tokens or refresh tokens. AdaptFit only
uses Google for sign-in right now. If the app later needs Google Calendar,
Google Fit, or another Google API, those tokens should be stored separately and
encrypted at rest.

## Step 10: Backend Regenerates And Creates The Express Session

After the user exists, login regenerates the Express session before storing the
user id:

```js
req.session.regenerate((regenerateError) => {
  if (regenerateError) {
    console.error(regenerateError);
    return res.status(500).json({ error: "Google login failed." });
  }

  req.session.userId = user.id;
  return res.json({ user: serializeUser(user) });
});
```

Regenerating the session gives the logged-in browser a fresh session id. That
reduces session fixation risk because the app does not keep using a session id
that may have existed before authentication.

This is the only application data needed in the session right now.

The code does not call `res.cookie(...)` manually. Once the regenerated session
has `req.session.userId` set, `express-session` knows the session has been
modified. It sends the signed session cookie in the response and stores the
session data through `connect-pg-simple`.

The session cookie contains a signed session id, not the full user record.

The PostgreSQL `session` table stores serialized session data. That serialized
data includes:

```js
{
  userId: "the-users-uuid";
}
```

The old manual implementation generated random tokens, hashed them, and stored
the hashes in a custom `sessions` table. That is no longer how login works.

## Step 11: Backend Returns The User

The route returns a serialized user:

```js
return res.json({ user: serializeUser(user) });
```

`serializeUser()` converts database column names into frontend field names:

```js
export function serializeUser(user) {
  const plainUser = toPlainUser(user);

  return {
    id: plainUser.id,
    email: plainUser.email,
    firstName: plainUser.first_name,
    lastName: plainUser.last_name,
    fullName: plainUser.full_name,
    avatarUrl: plainUser.avatar_url,
  };
}
```

The frontend expects this shape:

```ts
export type AuthUser = {
  id: string;
  email: string;
  firstName: string;
  lastName?: string | null;
  fullName?: string | null;
  avatarUrl?: string | null;
};
```

## Step 12: Frontend Stores User In React State

Back in `Login.tsx`:

```tsx
const user = await loginWithGoogle(credentialResponse.credential);
onLogin(user);
navigate("/dashboard", { replace: true });
```

`onLogin(user)` calls `App`'s handler:

```tsx
const handleLogin = (user: AuthUser) => {
  setAuthUser(user);
};
```

This is only UI state. It lets the navbar immediately render the logged-in view.

It is not the durable source of authentication. The durable source is the
backend session cookie plus the session row in PostgreSQL.

## Step 13: Frontend Redirects To Dashboard

After setting the user, the login page redirects to the dashboard:

```tsx
navigate("/dashboard", { replace: true });
```

`replace: true` removes the login page from the browser history stack for this
navigation. After a successful login, pressing Back should not take the user
back to the completed login page.

The navbar now sees `authUser` and renders:

```tsx
Hi, {authUser.firstName}!
```

## Refresh And Session Restore

When the page refreshes, React state is lost. `authUser` starts as `null` again:

```tsx
const [authUser, setAuthUser] = useState<AuthUser | null>(null);
```

`App` restores auth state by calling the backend:

```tsx
useEffect(() => {
  let isMounted = true;

  getCurrentUser()
    .then((user) => {
      if (isMounted) {
        setAuthUser(user);
      }
    })
    .catch(() => {
      if (isMounted) {
        setAuthUser(null);
      }
    });

  return () => {
    isMounted = false;
  };
}, []);
```

`getCurrentUser()` calls `/auth/me`:

```ts
export async function getCurrentUser(): Promise<AuthUser | null> {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    credentials: "include",
  });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new Error("Current user request failed");
  }

  return parseAuthResponse(response);
}
```

Again, `credentials: "include"` matters. It tells the browser to send the
`adaptfit_session` cookie.

The backend route is:

```js
authRouter.get("/me", isAuthenticated, async (req, res) => {
  return res.json({ user: serializeUser(req.user) });
});
```

`isAuthenticated` trusts `express-session` to load `req.session` from the
PostgreSQL session store:

```js
import { findUserById } from "../utils/models/users.js";

export async function isAuthenticated(req, res, next) {
  try {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "Not Authenticated" });
    }

    const user = await findUserById(req.session.userId);
    if (!user) {
      req.session.destroy(() => {});
      return res.status(401).json({ error: "Not Authenticated" });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Authentication failed." });
  }
}
```

There is no custom cookie parser here anymore. `express-session` reads the
cookie, verifies the signed session id, loads the session row from PostgreSQL,
and attaches the result to `req.session`.

If `req.session.userId` exists, `isAuthenticated` loads the current user:

```js
export async function findUserById(id) {
  const user = await User.findByPk(id);
  return toPlainUser(user) || null;
}
```

If the user exists, `/auth/me` returns the user and `App` restores `authUser`.

If the session is missing, expired, invalid, or points to a deleted user,
`/auth/me` returns `401`, and the frontend remains logged out.

## Failure Cases

Missing backend Google client ID:

```js
return res.status(500).json({ error: "GOOGLE_CLIENT_ID is not configured." });
```

Missing credential from frontend:

```js
return res.status(400).json({ error: "Google credential is required." });
```

Invalid Google credential:

```js
return res.status(401).json({ error: "Invalid Google credential." });
```

Unverified Google account:

```js
return res.status(401).json({ error: "Google account could not be verified." });
```

Missing session secret during backend startup:

```js
if (!secret) {
  throw new Error("SESSION_SECRET is not configured.");
}
```

Frontend login error:

```tsx
setErrorMessage("Google login failed. Please try again.");
```

Missing or invalid app session during restore:

```js
if (!req.session?.userId) {
  return res.status(401).json({ error: "Not Authenticated" });
}
```

Session points to a deleted user:

```js
const user = await findUserById(req.session.userId);
if (!user) {
  req.session.destroy(() => {});
  return res.status(401).json({ error: "Not Authenticated" });
}
```

## Developer Checklist

To make login work locally:

1. Create the PostgreSQL database.
2. Set `DATABASE_URL` in `adaptfit-api/.env`.
3. Set `GOOGLE_CLIENT_ID` in `adaptfit-api/.env`.
4. Set `SESSION_SECRET` in `adaptfit-api/.env`.
5. Set `VITE_OAUTH_CLIENT_ID` in `adaptfit-app/.env`.
6. Set `VITE_API_BASE_URL=http://localhost:3000`.
7. Set `CLIENT_ORIGIN=http://localhost:5173`.
8. Start the backend so Sequelize can create the application tables and
   `connect-pg-simple` can create the `session` table.
9. Start the frontend.
10. Confirm Google Cloud has `http://localhost:5173` as an authorized JavaScript
    origin.

## Key Mental Model

React state answers:

```text
What should the UI show right now?
```

The Express session answers:

```text
Is this browser authenticated, and which user id is attached to the session?
```

PostgreSQL answers:

```text
Which users exist, and which Express sessions are still valid?
```

Sequelize answers:

```text
How does the backend express user reads/writes in application code?
```

`connect-pg-simple` answers:

```text
How does express-session persist sessions in PostgreSQL instead of memory?
```
