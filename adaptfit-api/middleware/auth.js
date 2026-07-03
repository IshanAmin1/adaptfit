import { findSessionByToken } from "../models/sessions.js";
import { findUserById } from "../models/users.js";

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "adaptfit_session";

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

export async function isAuthenticated(req, res, next) {
  try {
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
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Authentication failed." });
  }
}

export function getSessionToken(req) {
  const cookies = parseCookies(req.headers.cookie);
  return cookies[COOKIE_NAME] || null;
}
