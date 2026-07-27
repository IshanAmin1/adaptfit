import { OAuth2Client } from "google-auth-library";
import { Router } from "express";
import { randomBytes } from "node:crypto";
import { isAuthenticated } from "../middleware/auth.js";
import { authRateLimit } from "../middleware/rate_limit.js";
import { getBillingStatusForUser } from "../utils/models/subscriptions.js";
import { serializeUser, upsertGoogleUser } from "../utils/models/users.js";
import {
	GOOGLE_CLIENT_ID,
	GOOGLE_CLIENT_SECRET,
	GOOGLE_REDIRECT_URI,
} from "../config/env/google.js";
import { COOKIE_NAME } from "../config/env/session.js";
import { CLIENT_ORIGIN } from "../config/env/server.js";

export const authRouter = Router();

const googleClient = new OAuth2Client(
	GOOGLE_CLIENT_ID,
	GOOGLE_CLIENT_SECRET,
	GOOGLE_REDIRECT_URI,
);

// https://developers.google.com/identity/protocols/oauth2/scopes#oauth2
const GOOGLE_AUTH_SCOPES = ["openid", "email", "profile"];

function getClientUrl(path) {
	return new URL(path, CLIENT_ORIGIN).toString();
}

function redirectToLoginError(res) {
	return res.redirect(getClientUrl("/login?oauth_error=google"));
}

async function getVerifiedGooglePayload(idToken) {
	const ticket = await googleClient.verifyIdToken({
		idToken,
		audience: GOOGLE_CLIENT_ID,
	});

	return ticket.getPayload();
}

async function upsertUserFromGooglePayload(payload) {
	if (!payload?.sub || !payload.email || !payload.email_verified) {
		return null;
	}

	return upsertGoogleUser({
		googleSub: payload.sub,
		email: payload.email,
		emailVerified: payload.email_verified,
		firstName: payload.given_name || null,
		lastName: payload.family_name || null,
		fullName: payload.name || null,
		avatarUrl: payload.picture || null,
	});
}

authRouter.get("/google/start", authRateLimit, async (req, res) => {
	try {
		const { codeVerifier, codeChallenge } =
			await googleClient.generateCodeVerifierAsync();
		// random CSRF protection state value to prevent CSRF attacks
		// by ensuring the state value in the callback matches the one generated here
		const state = randomBytes(32).toString("base64url");

		req.session.googleOAuth = {
			codeVerifier,
			state,
		};

		const authorizationUrl = googleClient.generateAuthUrl({
			access_type: "online",
			code_challenge: codeChallenge,
			code_challenge_method: "S256",
			scope: GOOGLE_AUTH_SCOPES,
			state,
		});

		req.session.save((saveError) => {
			if (saveError) {
				console.error(saveError);
				return res.status(500).json({ error: "Google login failed." });
			}

			return res.redirect(authorizationUrl);
		});
	} catch (error) {
		console.error(error);
		return res.status(500).json({ error: "Google login failed." });
	}
});

authRouter.get("/google/callback", authRateLimit, async (req, res) => {
	try {
		const { code, error, state } = req.query;
		const googleOAuth = req.session.googleOAuth;
		// no longer need to keep the code verifier and state in session anymore
		// delete them to prevent any potential security issues
		delete req.session.googleOAuth;

		if (error) {
			return redirectToLoginError(res);
		}

		if (
			typeof code !== "string" ||
			typeof state !== "string" ||
			!googleOAuth ||
			googleOAuth.state !== state
		) {
			return redirectToLoginError(res);
		}

		const { tokens } = await googleClient.getToken({
			code,
			codeVerifier: googleOAuth.codeVerifier,
			redirect_uri: GOOGLE_REDIRECT_URI,
		});

		if (!tokens.id_token) {
			return redirectToLoginError(res);
		}

		const payload = await getVerifiedGooglePayload(tokens.id_token);
		const user = await upsertUserFromGooglePayload(payload);

		if (!user) {
			return redirectToLoginError(res);
		}

		req.session.regenerate((regenerateError) => {
			if (regenerateError) {
				console.error(regenerateError);
				return redirectToLoginError(res);
			}

			req.session.userId = user.id;
			req.session.save((saveError) => {
				if (saveError) {
					console.error(saveError);
					return redirectToLoginError(res);
				}

				return res.redirect(getClientUrl("/auth/callback"));
			});
		});
	} catch (error) {
		console.error(error);
		return redirectToLoginError(res);
	}
});

authRouter.get("/me", isAuthenticated, async (req, res) => {
	try {
		const billingStatus = await getBillingStatusForUser(req.user.id);
		return res.json({ user: serializeUser(req.user, billingStatus) });
	} catch (error) {
		console.error(error);
		return res.status(500).json({ error: "Current user request failed." });
	}
});

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
