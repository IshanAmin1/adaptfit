import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import pg from "pg";

const PgSession = connectPgSimple(session);
const { Pool } = pg;

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "adaptfit_session";
const SESSION_DAYS = Number(process.env.SESSION_DAYS || 7);
const SESSION_MAX_AGE = SESSION_DAYS * 24 * 60 * 60 * 1000;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not configured.");
}

const sessionPool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

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
