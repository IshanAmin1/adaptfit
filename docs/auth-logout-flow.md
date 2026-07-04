# Authentication Logout Flow

This document explains how logout works in AdaptFit from the moment a user
clicks `Log out` to the moment the Express session is destroyed, the browser
cookie is cleared, and the frontend returns to the unauthenticated UI.

Logout is not just a frontend state change. The frontend clears the UI state,
but the backend also destroys the app session that `express-session` stored in
PostgreSQL through `connect-pg-simple`.

## High-Level Flow

```text
1. User clicks Log out in the navbar.
2. Navbar calls googleLogout().
3. Navbar calls App's onLogout callback.
4. App calls the frontend logout API helper.
5. Frontend sends POST /auth/logout with credentials: "include".
6. Browser attaches the session cookie.
7. express-session loads req.session from the PostgreSQL session store.
8. Backend calls req.session.destroy(...).
9. connect-pg-simple removes the server-side session from PostgreSQL.
10. Backend clears the session cookie in the browser.
11. Frontend clears authUser from React state.
12. Navbar re-renders the Log in link.
```

## Why Logout Has Frontend And Backend Work

There are three different things to clean up:

1. Google Identity Services client helper state.
2. The server-side AdaptFit app session.
3. Local UI state in React.

React state controls what the user sees. If `authUser` is set, the navbar shows
`Hi, firstName!` and `Log out`. If `authUser` is `null`, the navbar shows
`Log in`.

The backend session controls whether the browser is actually authenticated. If
the session row still exists and the browser still has the cookie, a refresh can
restore login through `/auth/me`.

That means a correct logout should:

- clear Google client helper state,
- destroy the Express session,
- clear the browser cookie,
- clear React auth state.

## Files Involved

Frontend:

```text
adaptfit-app/src/components/Navbar.tsx
adaptfit-app/src/App.tsx
adaptfit-app/src/api/auth.ts
```

Backend:

```text
adaptfit-api/app.js
adaptfit-api/models/sessions.js
adaptfit-api/routers/auth_router.js
adaptfit-api/middleware/auth.js
```

## Starting Point: Authenticated Navbar

The user can only click `Log out` when `authUser` exists.

`adaptfit-app/src/components/Navbar.tsx`:

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
      {location.pathname === "/login" ? "Dashboard" : "Log in"}
    </Link>
  );
}
```

`authUser` is passed into `Navbar` from `App`:

```tsx
<Navbar authUser={authUser} onLogout={handleLogout} />
```

This keeps `Navbar` mostly presentational. It does not own auth state or talk
directly to the backend.

## Step 1: Navbar Handles The Click

At the top of `Navbar.tsx`, the component imports Google's logout helper:

```tsx
import { googleLogout } from "@react-oauth/google";
```

The logout handler is:

```tsx
const handleLogout = async () => {
  googleLogout();
  await onLogout();
};
```

`googleLogout()` clears Google Identity Services client-side helper state.

This is separate from the AdaptFit backend session. Google is the identity
provider, but AdaptFit owns the app session.

The important distinction:

```text
googleLogout()
  -> clears Google client helper state

onLogout()
  -> clears AdaptFit backend session and React auth state
```

The navbar awaits `onLogout()` because the parent handler is asynchronous.

## Step 2: App Calls The Frontend Logout API

`adaptfit-app/src/App.tsx` defines the parent logout handler:

```tsx
const handleLogout = async () => {
  try {
    await logout();
  } catch (error) {
    console.error(error);
  } finally {
    setAuthUser(null);
  }
};
```

The `logout()` function is imported from the frontend API wrapper:

```tsx
import { getCurrentUser, logout } from "./api/auth";
```

The `catch` logs a failed backend logout request for debugging. The `finally`
block matters:

```tsx
catch (error) {
  console.error(error);
} finally {
  setAuthUser(null);
}
```

Even if the backend request fails, the current tab should stop showing the user
as logged in. This is a UI cleanup step. It does not guarantee the backend
session was destroyed if the request failed, but it avoids leaving the visible UI
stuck in an authenticated state.

For a production app, a failed backend logout could also show an error or retry.
For this minimal implementation, logging the error and clearing local UI state
is acceptable.

The local state cleanup is:

```tsx
finally {
  setAuthUser(null);
}
```

## Step 3: Frontend Sends POST /auth/logout

`adaptfit-app/src/api/auth.ts`:

```ts
export async function logout(): Promise<void> {
  await fetch(`${API_BASE_URL}/auth/logout`, {
    method: "POST",
    credentials: "include",
  });
}
```

The request uses:

```ts
credentials: "include";
```

That tells the browser to attach the session cookie to the request.

This is required because the backend does not receive a session id in the JSON
body or an Authorization header. It receives the session id from the signed
cookie created by `express-session`.

Without `credentials: "include"`, the backend may receive a logout request with
no session cookie. In that case, there may be no loaded `req.session` to destroy.

## Step 4: Browser Sends The Session Cookie

During login, `express-session` set a cookie named:

```text
adaptfit_session
```

The cookie name comes from `adaptfit-api/models/sessions.js`:

```js
const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "adaptfit_session";
```

The exact name is not special, but it must be consistent with the session
middleware and logout route.

The session middleware uses it here:

```js
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
```

The logout route uses the same value when clearing the browser cookie:

```js
res.clearCookie(COOKIE_NAME);
```

## Step 5: Express Session Loads req.session

The backend installs the session middleware before the auth router:

`adaptfit-api/app.js`:

```js
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

The ordering matters. Because `app.use(sessionMiddleware())` runs before
`app.use("/auth", authRouter)`, every auth route receives `req.session`.

`express-session` reads the signed cookie, uses the session id inside it, and
loads the corresponding row from the Postgres-backed session store.

## Step 6: Backend Receives POST /auth/logout

The route is in `adaptfit-api/routers/auth_router.js`:

```js
authRouter.post("/logout", async (req, res) => {
  try {
    req.session.destroy((error) => {
      if (error) {
        console.error(error);
        return res.status(500).json({ error: "Logout failed." });
      }
      res.clearCookie(COOKIE_NAME); // clear cookie in browser
      return res.json({ ok: true });
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Logout failed." });
  }
});
```

The route does not manually parse the `Cookie` header.

The route does not hash a token.

The route does not call a Sequelize `Session` model.

All of that manual session code was replaced by `express-session`.

## Step 7: Backend Destroys The Express Session

The important backend line is:

```js
req.session.destroy((error) => {
```

`req.session.destroy(...)` asks the configured session store to delete the
server-side session.

The configured store is in `adaptfit-api/models/sessions.js`:

```js
store: new PgSession({
  pool: sessionPool,
  tableName: "session",
  createTableIfMissing: true,
}),
```

Because the store is `connect-pg-simple`, destroying the session removes the
matching session record from PostgreSQL's `session` table.

If destroy fails, logout returns a server error:

```js
if (error) {
  console.error(error);
  return res.status(500).json({ error: "Logout failed." });
}
```

If destroy succeeds, the route continues to clear the browser cookie.

## Step 8: Backend Clears The Cookie

After destroying the session, the backend clears the browser cookie:

```js
res.clearCookie(COOKIE_NAME); // clear cookie in browser
return res.json({ ok: true });
```

Destroying the server-side session removes the backend's copy of the session.
Clearing the cookie removes the browser's pointer to that session.

Both are useful:

- `req.session.destroy(...)` revokes the session server-side.
- `res.clearCookie(COOKIE_NAME)` tells the browser to delete its cookie.

If the cookie remained after the server-side session was destroyed, `/auth/me`
would still fail because the session id would no longer resolve to valid session
data. Clearing the cookie keeps the browser clean and avoids sending a stale
cookie on future requests.

## Step 9: Frontend Clears React State

After `logout()` either resolves or throws, `App` clears the user:

```tsx
setAuthUser(null);
```

Because this happens in `finally`, it also runs if the network request throws:

```tsx
const handleLogout = async () => {
  try {
    await logout();
  } catch (error) {
    console.error(error);
  } finally {
    setAuthUser(null);
  }
};
```

Once `authUser` becomes `null`, `Navbar` re-renders and shows:

```tsx
<Link
  to={location.pathname === "/login" ? "/" : "/login"}
  className="rounded-lg bg-[#17211f] px-4.25 py-2.75 font-black text-white no-underline"
>
  {location.pathname === "/login" ? "Dashboard" : "Log in"}
</Link>
```

The user now sees the logged-out UI.

## What Happens If Logout Is Clicked Twice

The first logout request destroys the session and clears the cookie.

A second logout request may have no useful session to destroy. The route is
still intended to leave the browser logged out. If the session has already been
removed, the practical result should still be unauthenticated UI plus no usable
session cookie.

For this implementation, the frontend clears `authUser` in `finally`, so the UI
returns to logged-out state even if the second backend call has nothing left to
destroy.

## What Happens If The Session Already Expired

Session validity is handled by `express-session` and the Postgres-backed store.
When `/auth/me` runs, `express-session` attempts to load the session. If there is
no valid session data, `isAuthenticated` sees no `userId`:

```js
if (!req.session?.userId) {
  return res.status(401).json({ error: "Not Authenticated" });
}
```

If a session expired before logout:

- `/auth/me` treats the user as unauthenticated.
- logout can still clear the browser cookie.
- `connect-pg-simple` handles session-store expiry based on the stored session
  expiration.

There is no custom `deleteExpiredSessions()` function anymore.

## Why Logout Does Not Use isAuthenticated Middleware

`POST /auth/logout` does not use:

```js
isAuthenticated;
```

That is intentional.

If the session is already expired, missing, or points to a deleted user, the
user should still be able to ask the server to clear the cookie. Requiring a
fully valid user for logout can make logout awkward in edge cases.

Instead, logout directly destroys whatever Express session is attached to the
request and clears the cookie name used by the app.

## Why googleLogout Is Not Enough

`googleLogout()` only interacts with Google Identity Services client state.

It does not know about:

- AdaptFit's Express session,
- the `adaptfit_session` cookie,
- the PostgreSQL `session` table,
- the Express `/auth/logout` route.

If the app only called `googleLogout()` and did not call the backend, then the
AdaptFit session cookie could still authenticate the browser on refresh.

That is why the navbar does both:

```tsx
const handleLogout = async () => {
  googleLogout();
  await onLogout();
};
```

## Why Frontend State Is Not Enough

If logout only ran:

```tsx
setAuthUser(null);
```

the navbar would switch to `Log in`, but the browser might still have a valid
session cookie.

On refresh, `App` would call:

```tsx
getCurrentUser();
```

That sends:

```ts
fetch(`${API_BASE_URL}/auth/me`, {
  credentials: "include",
});
```

If the old Express session still existed, `/auth/me` would return the user
again, and the app would appear logged back in.

That is why logout must destroy the backend session.

## Security Notes

The browser receives an HttpOnly session cookie:

```js
httpOnly: true,
```

That means frontend JavaScript cannot read the cookie:

```js
document.cookie;
```

The session cookie is signed with:

```js
secret,
```

That lets `express-session` detect tampering.

The session data is stored in PostgreSQL through:

```js
store: new PgSession({
  pool: sessionPool,
  tableName: "session",
  createTableIfMissing: true,
}),
```

The app does not store raw session tokens in a custom Sequelize model anymore.
It relies on `express-session` and `connect-pg-simple`.

Logout revokes the current server-side session with:

```js
req.session.destroy((error) => {
```

Then it tells the browser to remove the cookie with:

```js
res.clearCookie(COOKIE_NAME);
```

## Debugging Logout

If logout appears to work but refresh logs the user back in, check:

1. Does the frontend call `POST /auth/logout`?
2. Does that request include `credentials: "include"`?
3. Does the request include the `adaptfit_session` cookie in the browser network
   tab?
4. Does `SESSION_COOKIE_NAME` match the cookie created by `express-session`?
5. Does the backend route call `req.session.destroy(...)`?
6. Does the response include a `Set-Cookie` header clearing the cookie?
7. Does `App.tsx` call `setAuthUser(null)`?
8. Does the `session` table still contain a non-expired row for that browser's
   session?

If the session row is deleted but the cookie remains, `/auth/me` should still
return `401` because the session id no longer resolves to valid session data.

If the cookie is cleared but the session row remains, that browser is logged out
because it no longer has the session id, but a stale database row may remain
until expiry.

If neither is cleared, the logout route probably did not receive the cookie or
did not run.

## End-To-End Summary

```text
Logout:
1. User clicks Log out.
2. Navbar calls googleLogout().
3. Navbar calls App's onLogout callback.
4. App calls logout() from src/api/auth.ts.
5. logout() sends POST /auth/logout with credentials: "include".
6. Browser includes adaptfit_session cookie.
7. express-session loads req.session from PostgreSQL.
8. Backend calls req.session.destroy(...).
9. connect-pg-simple deletes the session from the session table.
10. Backend clears adaptfit_session from the browser.
11. Backend returns { ok: true }.
12. App clears authUser in React state.
13. Navbar shows Log in.
```
