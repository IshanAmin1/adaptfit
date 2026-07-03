import { OAuth2Client } from "google-auth-library";
import { Router } from "express";
import { isAuthenticated, getSessionToken } from "../middleware/auth.js";
import {
  createSession,
  deleteExpiredSessions,
  deleteSessionByToken,
  getCookieOptions,
} from "../models/sessions.js";
import { serializeUser, upsertGoogleUser } from "../models/users.js";

export const authRouter = Router();

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "adaptfit_session";
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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

    await deleteExpiredSessions();

    const session = await createSession(user.id);
    res.cookie(COOKIE_NAME, session.token, {
      ...getCookieOptions(),
      expires: session.expiresAt,
    });

    return res.json({ user: serializeUser(user) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Google login failed." });
  }
});

authRouter.get("/me", isAuthenticated, async (req, res) => {
  return res.json({ user: serializeUser(req.user) });
});

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
