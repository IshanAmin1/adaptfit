# Refactor OAuth flow to PKCE

> Refactor the current implicit OAuth 2.0 flow to instead use the auth code flow with PKCE for this SPA. Outline what additional things I have to change/add (for example, I now need to get my client secret and add that as an env variable which is used to exchange for an access token, and also include tasks needed to be accomplished for when the application gets deployed). Note that we only use this token to authenticate a user, after which we store the user_id in express session cookies, so we do not need to access external api’s with this token, so no refresh token is needed. Ask clarifying questions in case of contradictions with my prompt and the codebase. When an important architectural decision needs to be made, ask for clarifications in general instead of guessing what to do.
> Follow codestyle and architecture of existing code, i.e. using ES6 modules, using then()... chains on frontend instead of async/await, MVVM architecture, etc.

<details><summary>14 previous messages</summary>

> I’ll trace the existing OAuth path and session handoff first, then I’ll flag any prompt/code contradictions before changing the architecture. I’ll keep an eye on the frontend promise style and the backend module patterns so the refactor lands in the project’s own voice.
>
> <details><summary>Ran 3 commands</summary>
>
> - Ran `Get-ChildItem -Force`
> - Ran `rg -n "oauth|OAuth|implicit|token|access_token|id_token|session|passport|auth|callback|redirect|PKCE|code_verifier|code_challenge" .`
> - Ran `git status --short`
>
> </details>
>
> The repo looks clean, but the broad `rg` search hit a Windows sandbox launch issue. I’m switching to PowerShell’s native file search so I can still map the auth code without making noise in the tree.
>
> <details><summary>Ran 2 commands</summary>
>
> - Ran `Get-ChildItem -Recurse -File | Select-String -Pattern 'oauth|OAuth|implicit|token|access_token|id_token|session|passport|auth|callback|redirect|PKCE|code_verifier|code_challenge' -CaseSensitive:$false`
> - Ran `Get-ChildItem -Recurse -File -Include package.json,.env.example,.env,README.md,*.js,*.mjs,*.jsx,*.ts,*.tsx | Select-Object -ExpandProperty FullName`
>
> </details>
>
> PowerShell itself is being flaky through the WindowsApps shim now, including for simple recursive reads. I’m going to use the system PowerShell executable directly; same workspace, just a more stable launcher.
>
> <details><summary>Ran 2 commands</summary>
>
> - Ran `c:\windows\system32\windowspowershell\v1.0\powershell.exe -Command "Get-ChildItem -Recurse -File -Include package.json,.env.example,.env,README.md,*.js,*.mjs,*.jsx,*.ts,*.tsx | Select-Object -ExpandProperty FullName"`
> - Ran `c:\windows\system32\windowspowershell\v1.0\powershell.exe -Command "Get-ChildItem -Recurse -File | Select-String -Pattern 'oauth|OAuth|implicit|token|access_token|id_token|session|passport|auth|callback|redirect|PKCE|code_verifier|code_challenge' -CaseSensitive:$false"`
>
> </details>
>
> The wrapper is still trying to launch through `pwsh`, so I’m disabling login-shell wrapping for the next probes. This should get us back to boring file reads, which is exactly where we want to be.
>
> <details><summary>Ran 2 commands</summary>
>
> - Ran `Get-ChildItem -Recurse -File | Select-String -Pattern 'oauth|OAuth|implicit|token|access_token|id_token|session|passport|auth|callback|redirect|PKCE|code_verifier|code_challenge' -CaseSensitive:$false`
> - Ran `Get-ChildItem -Recurse -File -Include package.json,.env.example,.env,README.md,*.js,*.mjs,*.jsx,*.ts,*.tsx | Select-Object -ExpandProperty FullName`
>
> </details>
>
> That failure is sandbox-launch shaped rather than code-shaped. I’m going to ask the runner for elevated execution for the read-only search so I can inspect the project and avoid guessing at the OAuth architecture.
>
> <details><summary>Ran a command</summary>
>
> - Ran `Get-ChildItem -Recurse -File | Select-String -Pattern 'oauth|OAuth|implicit|token|access_token|id_token|session|passport|auth|callback|redirect|PKCE|code_verifier|code_challenge' -CaseSensitive:$false`
>
> </details>
>
> The search found the current Google auth pieces, but it also wandered into `node_modules` and timed out. I’ve got enough landmarks now: backend `auth_router`, Express session setup, and the React OAuth package; next I’m reading only the app source and docs.
>
> <details><summary>Ran 5 commands</summary>
>
> - Ran `Get-Content -Path README.md`
> - Ran `Get-Content -Path adaptfit-api\config\env\oauth.js`
> - Ran `Get-ChildItem -Recurse -File adaptfit-app\src | Select-Object -ExpandProperty FullName`
> - Ran `Get-Content -Path adaptfit-api\README.md`
> - Ran `Get-Content -Path adaptfit-api\routers\auth_router.js`
>
> </details>
>
> One prompt/code mismatch already popped up: this app is not currently doing the OAuth implicit access-token flow in your source; it’s using Google’s ID-token “credential” flow and the backend verifies that ID token. The target auth-code-plus-PKCE shape is still clear, but I’m checking frontend call sites before I decide whether this can stay one-page-popup based or needs a redirect callback route.
>
> <details><summary>Ran 12 commands</summary>
>
> - Ran `Get-ChildItem -Recurse -File adaptfit-app\src | Select-Object -ExpandProperty FullName`
> - Ran `Get-Content -Path adaptfit-app\src\main.tsx`
> - Ran `Get-Content -Path adaptfit-api\config\env\google.js`
> - Ran `Get-Content -Path adaptfit-api\config\env\utils.js`
> - Ran `Get-Content -Path adaptfit-app\src\App.tsx`
> - Ran `Get-Content -Path adaptfit-app\src\api\auth-service.ts`
> - Ran `Get-Content -Path adaptfit-app\src\pages\Login.tsx`
> - Ran `Get-Content -Path adaptfit-api\utils\general.js`
> - Ran `Get-ChildItem -Recurse -File adaptfit-api\config adaptfit-api\utils | Select-Object -ExpandProperty FullName`
> - Ran `Get-Content -Path adaptfit-api\package.json`
> - Ran `Get-Content -Path adaptfit-app\package.json`
> - Ran `Get-Content -Path package.json`
>
> </details>

</details>

I found an important mismatch before changing code: the app is not currently using implicit OAuth access tokens. It uses `@react-oauth/google`’s `GoogleLogin`, receives a Google ID token credential, sends it to `POST /auth/google`, and the API verifies that ID token before creating the Express session.

Before I refactor, I need one architectural choice from you:

Should the new auth-code + PKCE flow be a backend-redirect flow?

Concretely:

- frontend login button sends the browser to `GET /auth/google/start`
- backend stores `state` + PKCE `code_verifier` in the Express session
- Google redirects to backend `GET /auth/google/callback`
- backend exchanges the code using `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `code_verifier`
- backend verifies the returned ID token, stores `userId` in session, then redirects back to the SPA

This fits your “token only authenticates user, no refresh token needed” requirement and keeps the client secret server-only.

The alternative is a frontend callback route that stores PKCE state/verifier in browser storage and posts `{ code, codeVerifier }` to the backend. That is more SPA-native, but pushes more OAuth state handling into the browser.

Which direction do you want?

> Yes, OAuth should be handled in the backend, so the first approach is preferred, client secret should be server only

<details><summary>38 previous messages</summary>

> Great, that resolves the main fork. I’ll move the OAuth state and PKCE verifier into the server session, keep the secret in `adaptfit-api`, and make the SPA only initiate login plus handle the final redirect result.
>
> I’m reading the remaining auth-adjacent files and package types now. The goal is to reuse `google-auth-library` for URL generation, code exchange, and ID-token verification instead of hand-building protocol bits.
>
> <details><summary>Ran 6 commands</summary>
>
> - Ran `Get-Content -Path adaptfit-api\models\sessions.js`
> - Ran `Get-Content -Path adaptfit-api\app.js`
> - Ran `Get-Content -Path adaptfit-api\config\env\session.js`
> - Ran `Get-Content -Path adaptfit-api\config\env\client.js`
> - Ran `Get-Content -Path adaptfit-api\.env`
> - Ran `Get-Content -Path adaptfit-app\src\types\auth.ts`
>
> </details>
>
> A second small mismatch: your prompt mentioned adding a client secret env var, and that is correct for the chosen backend flow, but PKCE still needs a per-login verifier stored server-side. I’m adding both: a permanent `GOOGLE_CLIENT_SECRET` env value and transient session fields for `state`/`codeVerifier`.
>
> <details><summary>Ran 5 commands</summary>
>
> - Ran `Get-ChildItem -Recurse -File adaptfit-api\config\env | Select-Object -ExpandProperty FullName`
> - Ran `Get-Content -Path adaptfit-app\.env`
> - Ran `Select-String -Path node_modules\google-auth-library\build\src\auth\oauth2client.d.ts -Pattern "getToken|codeVerifier|generateAuthUrl|CodeVerifier" -Context 3`
> - Ran `Get-Content -Path adaptfit-app\tsconfig.json`
> - Ran `Get-Content -Path adaptfit-api\config\env\server.js`
>
> </details>
>
> The backend uses JavaScript ES modules, so I can keep the auth router compact and avoid new dependencies. I’m going to preserve the existing “verify Google identity, upsert user, regenerate app session” behavior, and only swap how the Google identity token is obtained.
>
> I’m editing the backend routes first. The new routes will be `/auth/google/start` and `/auth/google/callback`; the old JSON credential endpoint will be removed from the frontend path.
>
> <details><summary>Edited 2 files</summary>
>
> - Wrote `./adaptfit-api/config/env/google.js` (+8 -3)
> - Wrote `./adaptfit-api/routers/auth_router.js` (+148 -60)
>
> </details>
>
> The server side now owns Google redirects, PKCE generation, state validation, code exchange, and session creation. I’m moving the React side to “start login by navigating to backend” plus a tiny callback screen that reloads `/auth/me`.
>
> <details><summary>Created 2 files, edited 4 files</summary>
>
> - Wrote `./adaptfit-app/src/api/auth-service.ts` (+6 -19)
> - Wrote `./adaptfit-app/src/utils/auth-utils.ts` (+9 -0)
> - Wrote `./adaptfit-app/src/pages/Login.tsx` (+41 -64)
> - Wrote `./adaptfit-app/src/pages/AuthCallback.tsx` (+74 -0)
> - Wrote `./adaptfit-app/src/App.tsx` (+24 -24)
> - Wrote `./adaptfit-app/src/main.tsx` (+1 -4)
>
> </details>
>
> The frontend now treats Google as a server redirect, and the SPA callback only asks the API “who am I now?” before routing to subscribe/onboarding/dashboard. I’m checking for leftover Google OAuth client usage before updating docs and dependencies.
>
> <details><summary>Ran 3 commands</summary>
>
> - Ran `Select-String -Path adaptfit-api\**\*.js,adaptfit-app\src\**\*.ts,adaptfit-app\src\**\*.tsx -Pattern 'auth/google|GOOGLE_CLIENT_SECRET|GOOGLE_REDIRECT_URI|googleOAuth'`
> - Ran `Select-String -Path adaptfit-app\src\*.tsx,adaptfit-app\src\pages\*.tsx,adaptfit-app\src\api\*.ts -Pattern '@react-oauth|VITE_OAUTH|loginWithGoogle|GoogleLogin|GoogleOAuthProvider'`
> - Ran `git diff -- adaptfit-api\routers\auth_router.js adaptfit-api\config\env\google.js adaptfit-app\src\api\auth-service.ts adaptfit-app\src\pages\Login.tsx adaptfit-app\src\pages\AuthCallback.tsx adaptfit-app\src\App.tsx adaptfit-app\src\main.tsx adaptfit-app\src\utils\auth-utils.ts`
>
> </details>
>
> The source no longer needs `@react-oauth/google`; since the backend now performs the OAuth client work, I’m removing that frontend dependency rather than leaving a dead auth path behind.
>
> <details><summary>Ran 2 commands</summary>
>
> - Ran `npm uninstall @react-oauth/google -w adaptfit-app`
> - Ran `npm uninstall @react-oauth/google -w adaptfit-app`
>
> </details>
>
> Dependency removal succeeded and npm reported existing audit issues, which I’ll leave untouched since they’re outside this refactor. Next I’m updating the auth docs and deployment checklist so the new Google console/env requirements are explicit.
>
> <details><summary>Ran 4 commands</summary>
>
> - Ran `Get-ChildItem -Force adaptfit-api | Select-Object -ExpandProperty Name`
> - Ran `Get-Content -Path README.md`
> - Ran `Get-Content -Path adaptfit-api\README.md`
> - Ran `Get-ChildItem -Force adaptfit-app | Select-Object -ExpandProperty Name`
>
> </details>
>
> I’m adding the setup notes in the API README and proposal README now. I’m deliberately documenting the secret as server-only and the redirect URI as a Google Console deployment task, because those are the places this flow usually gets miswired.
>
> <details><summary>Edited 2 files</summary>
>
> - Wrote `./adaptfit-api/README.md` (+42 -13)
> - Wrote `./README.md` (+21 -6)
>
> </details>
>
> The docs now describe the new login flow and deployment work. I’m also cleaning the local frontend env file so it no longer advertises a client-side Google OAuth ID that the app does not use.
>
> <details><summary>Edited 2 files</summary>
>
> - Wrote `./adaptfit-app/.env` (+1 -2)
> - Wrote `./adaptfit-api/.env` (+2 -0)
>
> </details>
>
> I left the backend secret as a commented placeholder in `.env` rather than inventing a value, so startup will still force you to add the real Google client secret. Now I’m running the focused builds/lint checks and will fix anything the type checker catches.
>
> <details><summary>Ran 3 commands</summary>
>
> - Ran `node --check adaptfit-api\routers\auth_router.js`
> - Ran `npm run build -w adaptfit-app`
> - Ran `node --check adaptfit-api\config\env\google.js`
>
> </details>
>
> The same Windows shell-launch issue hit the verification commands. I’m rerunning the actual checks with escalation; these are non-destructive and only build/check syntax.
>
> <details><summary>Ran 3 commands</summary>
>
> - Ran `npm run build -w adaptfit-app`
> - Ran `node --check adaptfit-api\routers\auth_router.js`
> - Ran `node --check adaptfit-api\config\env\google.js`
>
> </details>
>
> The backend syntax checks passed. The frontend build caught one leftover import in `Navbar.tsx`, so I’m removing that last client-side Google logout hook and replacing it with the existing app-session logout behavior.
>
> <details><summary>Ran a command</summary>
>
> - Ran `Get-Content -Path adaptfit-app\src\components\Navbar.tsx`
>
> </details>
>
> That leftover was just calling `googleLogout()` from the removed package; because the app never stores Google tokens anymore, the Express logout is the only logout step needed.
>
> <details><summary>Edited a file, ran 2 commands</summary>
>
> - Wrote `./adaptfit-app/src/components/Navbar.tsx` (+9 -11)
> - Ran `Select-String -Path adaptfit-app\src\*.tsx,adaptfit-app\src\components\*.tsx,adaptfit-app\src\pages\*.tsx,adaptfit-app\src\api\*.ts -Pattern '@react-oauth|VITE_OAUTH|loginWithGoogle|GoogleLogin|GoogleOAuthProvider|googleLogout'`
> - Ran `npm run build -w adaptfit-app`
>
> </details>
>
> The frontend build is green now. I’m doing one more lint/type pass around the edited files, especially because the callback component has StrictMode guard logic and I want the hooks dependencies to be clean.
>
> <details><summary>Ran 3 commands</summary>
>
> - Ran `npm run lint -w adaptfit-app`
> - Ran `npx eslint adaptfit-api\routers\auth_router.js adaptfit-api\config\env\google.js`
> - Ran `npx tsc -p adaptfit-app\tsconfig.json --noEmit`
>
> </details>
>
> Lint and TypeScript both passed, and the backend auth files pass ESLint too. I’m doing a final diff/status check now so I can give you a precise summary and call out the env/deployment actions left for you.
>
> <details><summary>Ran 3 commands</summary>
>
> - Ran `git diff --stat`
> - Ran `git status --short`
> - Ran `git diff -- adaptfit-api\routers\auth_router.js adaptfit-api\README.md README.md adaptfit-app\src\pages\AuthCallback.tsx adaptfit-app\src\pages\Login.tsx adaptfit-app\src\App.tsx adaptfit-app\src\components\Navbar.tsx adaptfit-app\package.json package-lock.json`
>
> </details>
>
> One thing I noticed from the repo layout: there is both a root workspace lockfile and an `adaptfit-app/package-lock.json`. I updated the workspace lock already, and I’m refreshing the app-local lockfile too so dependency metadata stays consistent no matter where installs are run.
>
> <details><summary>Ran 4 commands</summary>
>
> - Ran `npm install --package-lock-only`
> - Ran `git diff --stat`
> - Ran `git status --short`
> - Ran `Select-String -Path adaptfit-app\package-lock.json -Pattern '@react-oauth/google'`
>
> </details>
>
> The app-local lockfile still had the removed package because npm treated the repo as a workspace install from inside the app folder. I’m forcing a package-lock-only refresh with workspaces disabled for that subproject.
>
> <details><summary>Ran 7 commands</summary>
>
> - Ran `npm install --package-lock-only --workspaces=false`
> - Ran `git status --short`
> - Ran `git diff --stat`
> - Ran `Select-String -Path adaptfit-app\package-lock.json -Pattern '@react-oauth/google'`
> - Ran `Select-String -Path adaptfit-api\routers\auth_router.js -Pattern 'google/start|google/callback|generateCodeVerifierAsync|getToken|regenerate'`
> - Ran `Select-String -Path adaptfit-app\src\pages\Login.tsx,adaptfit-app\src\pages\AuthCallback.tsx,adaptfit-app\src\App.tsx,adaptfit-api\README.md -Pattern 'getGoogleLoginUrl|AuthCallback|auth/callback|OAuth Deployment Checklist|GOOGLE_CLIENT_SECRET'`
> - Ran `git diff -- adaptfit-api\config\env\google.js adaptfit-app\package-lock.json`
>
> </details>
>
> One final read-only line lookup tripped the shell wrapper again, but I already have the important route line numbers from the successful lookup. The implementation and verification are complete; I’ll wrap up with what changed and what you still need to configure.
>
> <details><summary>Plan</summary>
>
> - [x] Map backend/frontend auth touchpoints
> - [x] Implement backend Google auth-code PKCE routes
> - [x] Update SPA login/callback handling
> - [x] Update env/docs deployment checklist
> - [x] Run focused verification
>
> </details>

</details>

Implemented the backend-owned Google auth-code + PKCE flow.

What changed:

- Added backend routes in [auth_router.js](./adaptfit-api/routers/auth_router.js:58):
  - `GET /auth/google/start`: creates PKCE verifier/challenge, stores verifier + `state` in Express session, redirects to Google.
  - `GET /auth/google/callback`: validates `state`, exchanges code using server-only client secret + PKCE verifier, verifies returned ID token, upserts user, stores `userId` in session.
- Added server-only Google env config in [google.js](./adaptfit-api/config/env/google.js).
- Updated SPA login to redirect to the backend instead of using `@react-oauth/google`.
- Added SPA callback page [AuthCallback.tsx](./adaptfit-app/src/pages/AuthCallback.tsx) that reloads `/auth/me` and routes the user.
- Removed `@react-oauth/google` from frontend dependencies and lockfiles.
- Updated docs with local/deployment OAuth tasks in [adaptfit-api README](./adaptfit-api/README.md) and root [README](./README.md).

You still need to add/configure:

- `GOOGLE_CLIENT_SECRET` in `adaptfit-api/.env` and deployment env.
- `GOOGLE_REDIRECT_URI`, e.g. `http://localhost:3000/auth/google/callback` locally and `https://api.adaptfit.me/auth/google/callback` in production.
- Register that exact callback URL in Google Cloud Console.
- Keep `VITE_API_BASE_URL` pointed at the API origin.
- For deployment, verify HTTPS, CORS credentials, persistent Postgres sessions, and cookie `sameSite`/domain behavior if frontend/API are on different sites.

Verification passed:

- `npm run build -w adaptfit-app`
- `npm run lint -w adaptfit-app`
- `npx tsc -p adaptfit-app\tsconfig.json --noEmit`
- `npx eslint adaptfit-api\routers\auth_router.js adaptfit-api\config\env\google.js`
- `node --check` on updated backend files

One note: the existing code was using Google ID-token credential login, not a true implicit access-token flow. The new implementation still uses the returned ID token only to authenticate the user, then relies on the Express session, so no refresh token is requested or stored.

> Explain exactly how this login flow works now, up to the part where we exchange the code verifier, client secret, and auth code for an access token in the backend

Here is the new login flow up to the backend code exchange.

1. User clicks “Continue with Google” in the SPA

In [Login.tsx](./adaptfit-app/src/pages/Login.tsx), clicking the button runs:

```ts
window.location.assign(authService.getGoogleLoginUrl());
```

That sends the browser to:

```txt
http://localhost:3000/auth/google/start
```

or whatever `VITE_API_BASE_URL` points to.

2. Backend starts the OAuth flow

In [auth_router.js](./adaptfit-api/routers/auth_router.js:58), `GET /auth/google/start` runs.

The backend generates:

```js
const { codeVerifier, codeChallenge } =
  await googleClient.generateCodeVerifierAsync();
const state = randomBytes(32).toString("base64url");
```

These are the important pieces:

- `codeVerifier`: secret random string kept only in the backend session.
- `codeChallenge`: derived from `codeVerifier`; safe to send to Google.
- `state`: random CSRF protection value.

3. Backend stores temporary OAuth data in the Express session

The backend stores:

```js
req.session.googleOAuth = {
  codeVerifier,
  state,
};
```

This session is backed by Postgres through `connect-pg-simple`, and the browser only receives the signed session cookie.

So the browser does not get the code verifier.

4. Backend builds the Google authorization URL

The backend calls:

```js
googleClient.generateAuthUrl({
  access_type: "online",
  code_challenge: codeChallenge,
  code_challenge_method: "S256",
  scope: ["openid", "email", "profile"],
  state,
});
```

This URL tells Google:

- this is an authorization-code login
- PKCE is being used
- the challenge method is `S256`
- AdaptFit only wants identity scopes
- no refresh-token/offline access is requested

5. Backend redirects the browser to Google

The backend saves the session first, then redirects:

```js
req.session.save(() => {
  return res.redirect(authorizationUrl);
});
```

This matters because Google will redirect back later, and the backend needs the saved `state` and `codeVerifier` to still exist in the user’s session.

6. User signs in with Google

The browser is now on Google’s hosted login/consent screen.

If successful, Google redirects the browser back to the configured callback URL:

```txt
http://localhost:3000/auth/google/callback?code=...&state=...
```

In production, it would be something like:

```txt
https://api.adaptfit.me/auth/google/callback?code=...&state=...
```

7. Backend receives Google callback

In [auth_router.js](./adaptfit-api/routers/auth_router.js:91), `GET /auth/google/callback` reads:

```js
const { code, error, state } = req.query;
const googleOAuth = req.session.googleOAuth;

delete req.session.googleOAuth;
```

At this point:

- `code` came from Google in the callback URL.
- `state` came from Google in the callback URL.
- `googleOAuth.codeVerifier` came from the backend session.
- `GOOGLE_CLIENT_SECRET` came from backend env.

8. Backend validates state before exchanging anything

The backend checks:

```js
typeof code === "string"
typeof state === "string"
googleOAuth exists
googleOAuth.state === state
```

This proves the callback belongs to the login flow that this server started for this browser session.

If this check fails, the backend redirects back to:

```txt
/login?oauth_error=google
```

9. Backend exchanges the auth code

This is the part you asked about. The backend calls:

```js
const { tokens } = await googleClient.getToken({
  code,
  codeVerifier: googleOAuth.codeVerifier,
  redirect_uri: GOOGLE_REDIRECT_URI,
});
```

Because `googleClient` was created with:

```js
const googleClient = new OAuth2Client(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI,
);
```

the token exchange includes the server-only client credentials plus the PKCE verifier.

Conceptually, the backend sends Google:

```txt
client_id=GOOGLE_CLIENT_ID
client_secret=GOOGLE_CLIENT_SECRET
code=AUTH_CODE_FROM_CALLBACK
code_verifier=ORIGINAL_BACKEND_STORED_CODE_VERIFIER
redirect_uri=GOOGLE_REDIRECT_URI
grant_type=authorization_code
```

Google verifies that:

- the auth code is valid
- the redirect URI matches
- the client secret matches the OAuth client
- the `code_verifier` matches the earlier `code_challenge`

If all checks pass, Google returns tokens to the backend, including an `id_token` and usually an `access_token`.

For this app, the important token is the `id_token`, because after this point AdaptFit only uses Google to identify the user and then switches to its own Express session.

> In Login.tsx, why do we redirect the window the window.location.assign(authService.getGoogleLoginUrl()); where the url is a backend GET endpoint to /auth/google/start?
> I noticed that it redirects to the auth url generated by the client with our parameters too after saving the session. Why can we do this with the GET endpoint?
>
> After a user logs in with google, does it automatically redirect to /auth/google/callback because I configured authorized redirect URIs, and it chose the localhost version instead of the domain version?
>
> In the callback endpoint, why do we delete:
> delete _req_.session.googleOAuth;?

Yes, exactly: the SPA redirects to a backend `GET` endpoint because OAuth login is a browser navigation flow, not an AJAX/API data flow.

`window.location.assign(authService.getGoogleLoginUrl())` sends the whole browser to:

```txt
GET /auth/google/start
```

That endpoint is allowed to do two things normal API calls often do not want to do:

1. Save temporary OAuth data into the server session:

```js
req.session.googleOAuth = {
  codeVerifier,
  state,
};
```

2. Return an HTTP redirect response:

```js
res.redirect(authorizationUrl);
```

The browser follows that redirect to Google. So the chain is:

```txt
SPA /login
 -> backend /auth/google/start
 -> Google auth URL
 -> backend /auth/google/callback
 -> SPA /auth/callback
```

A `GET` endpoint is appropriate here because starting OAuth is intentionally a navigation action. The backend is not “logging the user in” yet at `/start`; it is preparing the login attempt and sending the browser to Google.

On the Google redirect URI question: Google redirects to the exact `redirect_uri` value included in the authorization URL, assuming it is one of the Authorized redirect URIs configured in Google Cloud Console.

In our backend, that comes from `GOOGLE_REDIRECT_URI`:

```js
export const GOOGLE_REDIRECT_URI = getEnvVariable(
  "GOOGLE_REDIRECT_URI",
  "http://localhost:3000/auth/google/callback",
);
```

So locally, if you have not set `GOOGLE_REDIRECT_URI`, it uses:

```txt
http://localhost:3000/auth/google/callback
```

Google does not “choose” localhost vs domain on its own. Our backend tells Google which callback URL to use. Google only checks whether that URL is allowed for the OAuth client. In production, you must set:

```txt
GOOGLE_REDIRECT_URI=https://api.adaptfit.me/auth/google/callback
```

and register that exact URI in Google Cloud Console.

For this line:

```js
delete req.session.googleOAuth;
```

we delete the temporary OAuth login data because it is single-use.

`googleOAuth` contains:

```js
{
  (codeVerifier, state);
}
```

Those values should only be valid for one login attempt. After Google calls us back, we no longer need them. Deleting them helps because:

- the same `state` cannot be reused later
- the same `codeVerifier` cannot hang around in the session
- a failed or completed callback does not leave stale OAuth state
- the session only keeps the real app login state afterward, meaning `userId`

So before login completes, the session temporarily has:

```js
req.session.googleOAuth = { codeVerifier, state };
```

After successful login, the session should only need:

```js
req.session.userId = user.id;
```

Small implementation note: after `delete req.session.googleOAuth`, the code later calls `req.session.regenerate(...)` on success, which creates a fresh session anyway. The delete is still useful for failure paths and for making the OAuth data explicitly one-time-use.
