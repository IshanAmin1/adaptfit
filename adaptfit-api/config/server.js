import { getEnvVariable } from "../utils/general.js";

export const PORT = getEnvVariable("PORT") || 3000;
export const CLIENT_ORIGIN = getEnvVariable("CLIENT_ORIGIN");
