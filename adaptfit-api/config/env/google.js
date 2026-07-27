import { getEnvVariable } from "../../utils/general.js";

export const GOOGLE_CLIENT_ID = getEnvVariable("GOOGLE_CLIENT_ID");
export const GOOGLE_CLIENT_SECRET = getEnvVariable("GOOGLE_CLIENT_SECRET");
export const GOOGLE_REDIRECT_URI = getEnvVariable("GOOGLE_REDIRECT_URI");
