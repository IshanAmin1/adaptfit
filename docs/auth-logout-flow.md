# Authentication Logout Flow

This document explains how logout works in AdaptFit from the moment a user clicks `Log out` to the moment the backend session is deleted, the browser cookie is cleared, and the frontend returns to the unauthenticated UI.

Logout is not just a frontend state change. The frontend clears the UI state, but the backend also deletes the session row from Postgres and clears the browser cookie.

## High-Level Flow

```text
1. User clicks Log out in the navbar.
2. Navbar calls googleLogout().
3. Navbar calls App's onLogout callback.
4. App calls the frontend logout API helper.
5. Frontend sends POST /auth/logout with credentials: "include".
6. Browser attaches the session cookie.
7. Backend reads the raw session token from the cookie.
8. Backend hashes the token and deletes the matching session row from Postgres.
9. Backend clears the session cookie.
10. Frontend clears authUser from React state.
11. Navbar re-renders the Log in link.
```

## Why Logout Has Frontend And Backend Work

There are two different things to clean up:

1. Local UI state in React.
2. The server-side app session.

React state controls what the user sees. If `authUser` is set, the navbar shows `Hi, firstName!` and `Log out`. If `authUser` is `null`, the navbar shows `Log in`.

The backend session controls whether the browser is actually authenticated. If the session row still exists and the browser still has the cookie, a refresh can restore login through `/auth/me`.

That means a correct logout should:

- clear Google client helper state,
- delete the AdaptFit session row,
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
adaptfit-api/routers/auth_router.js
adaptfit-api/middleware/auth.js
adaptfit-api/models/sessions.js
adaptfit-api/migrations/002_create_sessions.sql
```

## Starting Point: Authenticated Navbar

The user can only click `Log out` when `authUser` exists.

`adaptfit-app/src/components/Navbar.tsx`:

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

`authUser` is passed into `Navbar` from `App`:

```tsx
<Navbar authUser={authUser} onLogout={handleLogout} />
```

This keeps `Navbar` mostly presentational. It does not own auth state or talk directly to the backend.

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

`googleLogout()` clears Google Identity Services client-side state.

This is separate from the AdaptFit backend session. Google is the identity provider, but AdaptFit owns the app session.

The important distinction:

```text
googleLogout()
  -> clears Google client helper state

onLogout()
  -> clears AdaptFit backend session and React auth state
```

The navbar awaits `onLogout()` because the parent handler may be asynchronous.

## Step 2: App Calls The Frontend Logout API

`adaptfit-app/src/App.tsx` defines the parent logout handler:

```tsx
const handleLogout = async () => {
	try {
		await logout();
	} finally {
		setAuthUser(null);
	}
};
```

The `logout()` function is imported from the frontend API wrapper:

```tsx
import { getCurrentUser, logout } from "./api/auth";
```

The `finally` block matters:

```tsx
finally {
	setAuthUser(null);
}
```

Even if the backend request fails, the current tab should stop showing the user as logged in. This is a UI cleanup step. It does not guarantee the backend session was deleted if the request failed, but it avoids leaving the visible UI stuck in an authenticated state.

For a production app, a failed backend logout could also show an error or retry. For this minimal implementation, clearing local UI state is acceptable.

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
credentials: "include"
```

That tells the browser to attach the session cookie to the request.

This is required because the backend does not receive the session token in the JSON body or an Authorization header. It receives the session token from the cookie.

Without `credentials: "include"`, the backend may receive a logout request with no session cookie. It can still clear a cookie by name in the response, but it may not know which session row to delete.

## Step 4: Browser Sends The Session Cookie

During login, the backend set a cookie like:

```text
adaptfit_session=<raw-session-token>
```

The cookie name comes from:

```js
const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "adaptfit_session";
```

The exact name is not special, but it must be consistent. The backend uses the same name when:

- setting the cookie during login,
- reading the cookie during `/auth/me`,
- reading the cookie during `/auth/logout`,
- clearing the cookie during logout.

If login sets `adaptfit_session` but logout reads `session`, the backend will not find the token to delete.

## Step 5: Backend Receives POST /auth/logout

The route is in `adaptfit-api/routers/auth_router.js`:

```js
authRouter.post("/logout", async (req, res) => {
  try {
    const token = getSessionToken(req);

    if (token) {
      await deleteSessionByToken(token);
    }

    res.clearCookie(COOKIE_NAME, getCookieOptions());
    return res.json({ ok: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Logout failed." });
  }
});
```

Logout is intentionally tolerant. If there is no token, it still clears the cookie by name and returns `{ ok: true }`.

That makes logout idempotent from the user's point of view. Clicking logout when the cookie is already missing should still leave the app logged out.

## Step 6: Backend Reads The Session Token

The route calls:

```js
const token = getSessionToken(req);
```

`getSessionToken()` lives in `adaptfit-api/middleware/auth.js`:

```js
export function getSessionToken(req) {
  const cookies = parseCookies(req.headers.cookie);
  return cookies[COOKIE_NAME] || null;
}
```

It uses `parseCookies()`:

```js
function parseCookies(cookieHeader) {
  if (!cookieHeader) {
    return {};
  }

  return cookieHeader.split(";").reduce((cookies, cookie) => {
    const [rawName, ...rawValue] = cookie.trim().split("=");
    cookies[rawName] = decodeURIComponent(rawValue.join("="));
    return cookies;
  }, {});
}
```

The browser sends cookies as a single header string, roughly like:

```text
Cookie: adaptfit_session=abc123; other_cookie=value
```

`parseCookies()` turns that into:

```js
{
  adaptfit_session: "abc123",
  other_cookie: "value"
}
```

Then `getSessionToken()` returns the value under `COOKIE_NAME`.

## Step 7: Backend Deletes The Session Row

If the token exists, logout calls:

```js
await deleteSessionByToken(token);
```

`adaptfit-api/models/sessions.js`:

```js
export async function deleteSessionByToken(token) {
  await query("delete from sessions where session_token_hash = $1", [
    hashToken(token),
  ]);
}
```

The database does not store the raw token. It stores the hash.

So the backend must hash the raw cookie token before deleting:

```js
function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}
```

The session table stores:

```sql
session_token_hash text not null unique
```

from `adaptfit-api/migrations/002_create_sessions.sql`:

```sql
create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  session_token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
```

Deleting the session row revokes that browser's session. If the browser later tries to call `/auth/me` with the same old cookie token, the backend hashes it, fails to find a matching row, and returns `401`.

## Step 8: Backend Clears The Cookie

After deleting the database row, the backend clears the browser cookie:

```js
res.clearCookie(COOKIE_NAME, getCookieOptions());
return res.json({ ok: true });
```

`getCookieOptions()` is reused from session creation:

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

Using matching cookie options is important because browsers identify cookies by name plus attributes like path and domain. The clear operation should target the same cookie that was set during login.

The cookie was set with:

```js
res.cookie(COOKIE_NAME, session.token, {
  ...getCookieOptions(),
  expires: session.expiresAt,
});
```

So logout clears it with:

```js
res.clearCookie(COOKIE_NAME, getCookieOptions());
```

## Step 9: Frontend Clears React State

After `logout()` resolves, `App` clears the user:

```tsx
setAuthUser(null);
```

Because this happens in `finally`, it also runs if the network request throws:

```tsx
const handleLogout = async () => {
	try {
		await logout();
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

The first logout request deletes the session row and clears the cookie.

A second logout request may have no cookie token. In that case:

```js
const token = getSessionToken(req);

if (token) {
  await deleteSessionByToken(token);
}

res.clearCookie(COOKIE_NAME, getCookieOptions());
return res.json({ ok: true });
```

Because the delete only runs when `token` exists, the route still succeeds and clears the cookie by name again.

This is good behavior. Logout should be safe to call more than once.

## What Happens If The Session Already Expired

Session expiry is enforced by `findSessionByToken()` during `/auth/me`, not by logout:

```js
where sessions.session_token_hash = $1
  and sessions.expires_at > now()
```

If a session expired before logout:

- `/auth/me` would treat the user as unauthenticated.
- logout can still clear the cookie.
- if the expired row still exists, `deleteSessionByToken()` can delete it because it deletes by token hash only.

Expired rows are also cleaned up when login succeeds:

```js
export async function deleteExpiredSessions() {
  await query("delete from sessions where expires_at <= now()");
}
```

## Why Logout Does Not Need The Full isAuthenticated Middleware

`POST /auth/logout` does not use:

```js
isAuthenticated
```

That is intentional.

If the session is already expired or missing, the user should still be able to ask the server to clear the cookie. Requiring a fully valid session for logout can make logout awkward in edge cases.

Instead, logout directly reads the token if present:

```js
const token = getSessionToken(req);
```

Then it deletes the matching row if possible and clears the cookie either way.

## Why googleLogout Is Not Enough

`googleLogout()` only interacts with Google Identity Services client state.

It does not know about:

- AdaptFit's `sessions` table,
- the `adaptfit_session` cookie,
- the Postgres user row,
- the Express `/auth/logout` route.

If the app only called `googleLogout()` and did not call the backend, then the AdaptFit session cookie could still authenticate the browser on refresh.

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

the navbar would switch to `Log in`, but the browser might still have a valid session cookie.

On refresh, `App` would call:

```tsx
getCurrentUser()
```

That sends:

```ts
fetch(`${API_BASE_URL}/auth/me`, {
	credentials: "include",
});
```

If the old session row still existed, `/auth/me` would return the user again, and the app would appear logged back in.

That is why logout must delete the backend session row.

## Security Notes

The raw session token is in an HttpOnly cookie, not in JavaScript-accessible storage.

That means this does not expose the session token:

```js
document.cookie
```

The database stores only the hash:

```js
hashToken(token)
```

So if the database leaks, attackers do not immediately get usable session tokens.

Logout deletes the database row by hash:

```js
delete from sessions where session_token_hash = $1
```

That revokes the current raw token because it no longer has a matching verifier in Postgres.

## Debugging Logout

If logout appears to work but refresh logs the user back in, check:

1. Does the frontend call `POST /auth/logout`?
2. Does that request include `credentials: "include"`?
3. Does the request include the session cookie in the browser network tab?
4. Does `SESSION_COOKIE_NAME` match the cookie that login sets?
5. Does `deleteSessionByToken()` delete a row from `sessions`?
6. Does the response include a `Set-Cookie` header clearing the cookie?
7. Does `App.tsx` call `setAuthUser(null)`?

If the session row is deleted but the cookie remains, `/auth/me` should still return `401` because the hash lookup fails.

If the cookie is cleared but the session row remains, that browser is logged out, but the stale database row remains until cleanup or expiry.

If neither is cleared, the logout route probably did not receive the cookie or did not run.

## End-To-End Summary

```text
Logout:
1. User clicks Log out.
2. Navbar calls googleLogout().
3. Navbar calls App's onLogout callback.
4. App calls logout() from src/api/auth.ts.
5. logout() sends POST /auth/logout with credentials: "include".
6. Browser includes adaptfit_session cookie.
7. Backend parses Cookie header.
8. Backend extracts raw session token.
9. Backend hashes token.
10. Backend deletes matching sessions.session_token_hash row.
11. Backend clears adaptfit_session cookie.
12. Backend returns { ok: true }.
13. App clears authUser in React state.
14. Navbar shows Log in.
```
