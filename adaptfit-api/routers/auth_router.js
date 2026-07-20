import { OAuth2Client } from "google-auth-library";
import { Router } from "express";
import { isAuthenticated } from "../middleware/auth.js";
import { getBillingStatusForUser } from "../utils/models/subscriptions.js";
import { serializeUser, upsertGoogleUser } from "../utils/models/users.js";
import { GOOGLE_CLIENT_ID } from "../config/env/google.js";
import { COOKIE_NAME } from "../config/env/session.js";

export const authRouter = Router();

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

authRouter.post("/google", async (req, res) => {
	try {
		if (!req.body.credential) {
			return res.status(400).json({ error: "Google credential is required." });
		}

		let payload;
		try {
			const ticket = await googleClient.verifyIdToken({
				idToken: req.body.credential,
				audience: GOOGLE_CLIENT_ID,
			});
			payload = ticket.getPayload();
		} catch {
			return res.status(401).json({ error: "Invalid Google credential." });
		}

		if (!payload?.sub || !payload.email || !payload.email_verified) {
			return res
				.status(401)
				.json({ error: "Google account could not be verified." });
		}

		const user = await upsertGoogleUser({
			googleSub: payload.sub,
			email: payload.email,
			emailVerified: payload.email_verified,
			firstName: payload.given_name || null,
			lastName: payload.family_name || null,
			fullName: payload.name || null,
			avatarUrl: payload.picture || null,
		});
		const billingStatus = await getBillingStatusForUser(user.id);

		req.session.regenerate((regenerateError) => {
			if (regenerateError) {
				console.error(regenerateError);
				return res.status(500).json({ error: "Google login failed." });
			}

			req.session.userId = user.id;
			return res.json({ user: serializeUser(user, billingStatus) });
		});
	} catch (error) {
		console.error(error);
		return res.status(500).json({ error: "Google login failed." });
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
