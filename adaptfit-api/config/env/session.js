import { getEnvVariable } from "../../utils/general.js";

export const COOKIE_NAME = getEnvVariable(
	"SESSION_COOKIE_NAME",
	"adaptfit_session",
);
export const SESSION_DAYS = Number(getEnvVariable("SESSION_DAYS", 7));
export const SESSION_SECRET = getEnvVariable("SESSION_SECRET");
