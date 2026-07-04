# Authentication Login Flow

This document explains how login works in AdaptFit from the moment a user clicks `Log in` to the moment the user is authenticated, stored in PostgreSQL through Sequelize, given an app session, and redirected to the home page.

The current implementation is not frontend-only auth. The frontend receives a Google credential, but the backend verifies that credential and becomes the source of truth.

## High-Level Flow

```text
1. User clicks Log in in the navbar.
2. React routes the user to /login.
3. Login.tsx renders the GoogleLogin button.
4. Google returns a credential response to the frontend.
5. Frontend sends credentialResponse.credential to POST /auth/google.
6. Express backend verifies the Google ID token with Google.
7. Backend creates or updates the user through the Sequelize `User` model.
8. Backend creates an AdaptFit session.
9. Backend stores only the hashed session token through the Sequelize `Session` model.
10. Backend sends the raw session token to the browser as an HttpOnly cookie.
11. Backend returns the serialized user.
12. Frontend stores the user in React state.
13. Frontend redirects to /.
14. Navbar renders the authenticated UI.
```

## Why The Flow Is Designed This Way

The old frontend-only version decoded the Google ID token in the browser and stored a small user object in `localStorage`. That is useful for a mockup, but it is not enough once the app has protected backend data.

The backend must verify the Google token because:

- `jwtDecode` only parses a token; it does not verify the token signature.
- A user can edit frontend state and `localStorage`.
- The database needs a trusted app user, not just browser-provided profile data.
- Future routes will need to know which authenticated AdaptFit user is making the request.

The backend creates its own session because:

- AdaptFit should not depend on frontend state as proof of login.
- The browser can keep the user logged in after refresh using a cookie.
- The session can be revoked on logout by deleting the database row.
- Expired sessions can be rejected server-side.

## Files Involved

Frontend:

```text
adaptfit-app/src/components/Navbar.tsx
adaptfit-app/src/pages/Login.tsx
adaptfit-app/src/api/auth.ts
adaptfit-app/src/App.tsx
adaptfit-app/src/types/auth.ts
adaptfit-app/src/main.tsx
```

Backend:

```text
adaptfit-api/app.js
adaptfit-api/datasource.js
adaptfit-api/routers/auth_router.js
adaptfit-api/models/users.js
adaptfit-api/models/sessions.js
adaptfit-api/middleware/auth.js
adaptfit-api/scripts/run-migrations.js
adaptfit-api/migrations/001_create_users.sql
adaptfit-api/migrations/002_create_sessions.sql
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
```

`DATABASE_URL` is a PostgreSQL connection string. `adaptfit-api/datasource.js` passes it to Sequelize with the `postgres` dialect, and Sequelize uses the `pg` driver underneath.

The frontend and backend both need the Google client ID, but for different reasons.

The frontend uses `VITE_OAUTH_CLIENT_ID` to render the Google Identity Services button.

The backend uses `GOOGLE_CLIENT_ID` to verify that the Google ID token was issued for this exact app.

`SESSION_COOKIE_NAME` can be any valid cookie name, but it must be consistent wherever the backend sets, reads, and clears the cookie. `adaptfit_session` is a good default.

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

`GoogleOAuthProvider` gives child components access to Google Identity Services. Without it, `GoogleLogin` will not have the configured client ID.

The client ID is safe to expose to browser JavaScript. It identifies the app to Google, but it is not a private secret.

## Step 1: Navbar Sends The User To Login

`adaptfit-app/src/components/Navbar.tsx` receives `authUser` from `App`.

When `authUser` is `null`, the navbar shows the login link:

```tsx
{authUser ? (
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
    {location.pathname === "/login" ? "Dashboard" : "Log in"}
  </Link>
)}
```

The login link navigates to `/login`.

The route is defined in `adaptfit-app/src/App.tsx`:

```tsx
<Routes>
  <Route path="/" element={<Dashboard />} />
  <Route path="/login" element={<Login onLogin={handleLogin} />} />
</Routes>
```

`App` passes `handleLogin` to `Login` because `App` owns the top-level auth state.

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
{errorMessage ? (
  <p className="m-0 text-sm font-semibold text-red-700" role="alert">
    {errorMessage}
  </p>
) : null}
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
    navigate("/", { replace: true });
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

The frontend does not decode the token and does not use it as proof of authentication. That is the backend's job.

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

This is important because the frontend and backend run on different origins in development:

```text
Frontend: http://localhost:5173
Backend:  http://localhost:3000
```

Different ports mean different origins. `credentials: "include"` tells the browser to allow cookies on this cross-origin request.

During login, that means the browser is allowed to accept the backend's `Set-Cookie` response.

During later authenticated requests, that means the browser sends the stored session cookie back to the backend.

Without `credentials: "include"`, login might appear to work because the backend returns user JSON, but the browser may not store the session cookie. After refresh, `/auth/me` would return `401`, and the user would appear logged out.

## Step 5: Express Accepts JSON And Cookies Across Origins

The backend setup lives in `adaptfit-api/app.js`:

```js
import "dotenv/config";
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import { sequelize } from "./datasource.js";
import { authRouter } from "./routers/auth_router.js";

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

try {
  await sequelize.authenticate();
  console.log("Connection has been established successfully.");
} catch (error) {
  console.error("Unable to connect to the database:", error);
}

app.get("/api/health", (req, res) => {
  return res.json({ status: "ok" });
});

app.use("/auth", authRouter);
```

`adaptfit-api/datasource.js` creates the Sequelize connection:

```js
import "dotenv/config";
import { Sequelize } from "sequelize";

export const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: "postgres",
  logging: false,
});
```

`cors({ origin: CLIENT_ORIGIN, credentials: true })` is the backend half of cross-origin cookie support.

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

`app.use("/auth", authRouter)` mounts the auth routes:

```text
POST /auth/google
GET /auth/me
POST /auth/logout
```

## Step 6: Backend Verifies The Google ID Token

The login route is in `adaptfit-api/routers/auth_router.js`.

Setup:

```js
import { OAuth2Client } from "google-auth-library";
import { Router } from "express";
import {
  createSession,
  deleteExpiredSessions,
  getCookieOptions,
} from "../models/sessions.js";
import { serializeUser, upsertGoogleUser } from "../models/users.js";

export const authRouter = Router();

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "adaptfit_session";
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
```

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

`verifyIdToken()` checks that the credential is a real Google ID token and that it was issued for this app's Google client ID.

This is the key reason the backend exists. The frontend can receive a Google credential, but the backend decides whether it is trustworthy.

The route also requires Google to provide a stable user ID, email, and verified email:

```js
if (!payload?.sub || !payload.email || !payload.email_verified) {
  return res
    .status(401)
    .json({ error: "Google account could not be verified." });
}
```

`payload.sub` is Google's stable provider user ID. It is better than email as the long-term link to the Google account because a user's email may change.

## Step 7: Backend Creates Or Updates The User

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

The PostgreSQL table comes from `adaptfit-api/migrations/001_create_users.sql`:

```sql
create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  google_sub text not null unique,
  email text not null unique,
  email_verified boolean not null default false,
  first_name text,
  last_name text,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

`adaptfit-api/models/users.js` defines a Sequelize model for that table and contains the upsert:

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

The route does not store Google access tokens or refresh tokens. AdaptFit only uses Google for sign-in right now. If the app later needs Google Calendar, Google Fit, or another Google API, those tokens should be stored separately and encrypted at rest.

## Step 8: Backend Creates An AdaptFit Session

After the user exists, the route cleans up expired sessions and creates a new session:

```js
await deleteExpiredSessions();

const session = await createSession(user.id);
```

The PostgreSQL session table comes from `adaptfit-api/migrations/002_create_sessions.sql`:

```sql
create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  session_token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists sessions_user_id_idx on sessions(user_id);
create index if not exists sessions_expires_at_idx on sessions(expires_at);
```

`user_id` connects the session to the authenticated user.

`on delete cascade` means that if a user is deleted, that user's sessions are deleted too.

`adaptfit-api/models/sessions.js` defines a Sequelize `Session` model and creates the session:

```js
export async function createSession(userId) {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await Session.create({
    user_id: userId,
    session_token_hash: tokenHash,
    expires_at: expiresAt,
  });

  return { token, expiresAt };
}
```

The raw token is random:

```js
crypto.randomBytes(32).toString("hex");
```

The database stores only the hash:

```js
function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}
```

The raw token goes to the browser cookie. The hash goes to PostgreSQL through Sequelize.

This is intentional. If the database leaks, attackers should not immediately receive usable session tokens. The backend can still verify the cookie by hashing the raw cookie token and comparing it to the stored hash.

## Step 9: Backend Sets The Session Cookie

The login route sets a cookie:

```js
res.cookie(COOKIE_NAME, session.token, {
  ...getCookieOptions(),
  expires: session.expiresAt,
});

return res.json({ user: serializeUser(user) });
```

`getCookieOptions()` is:

```js
export function getCookieOptions() {
  return {
    httpOnly: true, // JavaScript cannot access the cookie, helps prevent XSS attacks
    sameSite: "lax", // restricts when cookies are sent, helps prevent CSRF attacks
    secure: process.env.NODE_ENV === "production", // ensures cookies are only sent over HTTPS in production
    path: "/",
  };
}
```

`httpOnly: true` means frontend JavaScript cannot read the cookie. The browser manages the cookie automatically.

`sameSite: "lax"` reduces CSRF exposure by limiting when cookies are sent from cross-site contexts.

`secure: process.env.NODE_ENV === "production"` means the cookie is `Secure` only in production. A secure cookie is sent only over HTTPS. Local development usually uses plain HTTP, so `secure` must be false locally or the browser may refuse to store/send the cookie.

`path: "/"` lets the cookie be sent to all backend routes, including `/auth/me` and `/auth/logout`.

`httpOnly` still matters even when `secure` is false in development. They protect against different threats:

```text
httpOnly protects against JavaScript reading the cookie.
secure protects against sending the cookie over non-HTTPS network traffic.
```

In production, both should be active.

## Step 10: Backend Returns The User

The route returns a serialized user:

```js
return res.json({ user: serializeUser(user) });
```

`serializeUser()` converts database column names into frontend field names:

```js
export function serializeUser(user) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    fullName: user.full_name,
    avatarUrl: user.avatar_url,
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

## Step 11: Frontend Stores User In React State

Back in `Login.tsx`:

```tsx
const user = await loginWithGoogle(credentialResponse.credential);
onLogin(user);
navigate("/", { replace: true });
```

`onLogin(user)` calls `App`'s handler:

```tsx
const handleLogin = (user: AuthUser) => {
  setAuthUser(user);
};
```

This is only UI state. It lets the navbar immediately render the logged-in view.

It is not the durable source of authentication. The durable source is the backend session cookie plus the session row in PostgreSQL.

## Step 12: Frontend Redirects Home

After setting the user, the login page redirects:

```tsx
navigate("/", { replace: true });
```

`replace: true` removes the login page from the browser history stack for this navigation. After a successful login, pressing Back should not take the user back to the completed login page.

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

The backend route is:

```js
authRouter.get("/me", isAuthenticated, async (req, res) => {
  return res.json({ user: serializeUser(req.user) });
});
```

`isAuthenticated` validates the cookie and loads the user:

```js
const cookies = parseCookies(req.headers.cookie);
const token = cookies[COOKIE_NAME];

if (!token) {
  return res.status(401).json({ error: "Not Authenticated" });
}

const session = await findSessionByToken(token);
if (!session) {
  res.clearCookie(COOKIE_NAME);
  return res.status(401).json({ error: "Not Authenticated" });
}

const user = await findUserById(session.user_id);
if (!user) {
  res.clearCookie(COOKIE_NAME);
  return res.status(401).json({ error: "Not Authenticated" });
}

req.session = session;
req.user = user;
next();
```

`findSessionByToken()` enforces expiry:

```js
export async function findSessionByToken(token) {
  const session = await Session.findOne({
    attributes: ["id", "user_id"],
    where: {
      session_token_hash: hashToken(token),
      expires_at: {
        [Op.gt]: new Date(),
      },
    },
  });

  return session?.get({ plain: true }) || null;
}
```

If the session exists and is not expired, `/auth/me` returns the user and `App` restores `authUser`.

If the session is missing, invalid, or expired, `/auth/me` returns `401`, and the frontend remains logged out.

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

Frontend login error:

```tsx
setErrorMessage("Google login failed. Please try again.");
```

Expired session:

```js
expires_at: {
  [Op.gt]: new Date(),
}
```

If `expires_at` is not greater than `now()`, the session does not authenticate.

## Developer Checklist

To make login work locally:

1. Create the PostgreSQL database.
2. Set `DATABASE_URL` in `adaptfit-api/.env`.
3. Set `GOOGLE_CLIENT_ID` in `adaptfit-api/.env`.
4. Set `VITE_OAUTH_CLIENT_ID` in `adaptfit-app/.env`.
5. Set `VITE_API_BASE_URL=http://localhost:3000`.
6. Set `CLIENT_ORIGIN=http://localhost:5173`.
7. Run backend migrations.
8. Start the backend.
9. Start the frontend.
10. Confirm Google Cloud has `http://localhost:5173` as an authorized JavaScript origin.

## Key Mental Model

React state answers:

```text
What should the UI show right now?
```

The backend session answers:

```text
Is this browser actually authenticated?
```

PostgreSQL answers:

```text
Which AdaptFit user is authenticated, and is the session still valid?
```

Sequelize answers:

```text
How does the backend express user and session reads/writes in application code?
```
