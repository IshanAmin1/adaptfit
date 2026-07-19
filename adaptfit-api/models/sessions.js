import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import pg from "pg";
import { DATABASE_URL } from "../config/env/storage.js";
import {
	COOKIE_NAME,
	SESSION_DAYS,
	SESSION_SECRET,
} from "../config/env/session.js";

const PgSession = connectPgSimple(session);
const { Pool } = pg;

const SESSION_MAX_AGE = SESSION_DAYS * 24 * 60 * 60 * 1000;

const sessionPool = new Pool({
	connectionString: DATABASE_URL,
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
	return session({
		name: COOKIE_NAME,
		secret: SESSION_SECRET,
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
