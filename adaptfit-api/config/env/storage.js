import { getEnvVariable } from "../../utils/general.js";

export const DATABASE_URL = getEnvVariable("DATABASE_URL");

export const REDIS_HOST = getEnvVariable("REDIS_HOST", "localhost");
export const REDIS_PORT = getEnvVariable("REDIS_PORT", 6381);
