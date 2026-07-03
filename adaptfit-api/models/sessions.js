import crypto from "crypto";
import { query } from "../datasource.js";

const SESSION_DAYS = Number(process.env.SESSION_DAYS || 7);

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function getCookieOptions() {
  return {
    httpOnly: true, // JavaScript cannot access the cookie, helps prevent XSS attacks
    sameSite: "lax", // restricts when cookies are sent, helps prevent CSRF attacks
    secure: process.env.NODE_ENV === "production", // ensures cookies are only sent over HTTPS in production
    path: "/",
  };
}

export async function createSession(userId) {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await query(
    `
      insert into sessions (user_id, session_token_hash, expires_at)
      values ($1, $2, $3)
    `,
    [userId, tokenHash, expiresAt],
  );

  return { token, expiresAt };
}

export async function findSessionByToken(token) {
  const result = await query(
    `
      select sessions.id, sessions.user_id
      from sessions
      where sessions.session_token_hash = $1
        and sessions.expires_at > now()
    `,
    [hashToken(token)],
  );

  return result.rows[0] || null;
}

export async function deleteSessionByToken(token) {
  await query("delete from sessions where session_token_hash = $1", [
    hashToken(token),
  ]);
}

export async function deleteExpiredSessions() {
  await query("delete from sessions where expires_at <= now()");
}
