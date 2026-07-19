import { getEnvVariable } from "../../utils/general.js";

export const OPENROUTER_API_KEY = getEnvVariable("OPENROUTER_API_KEY");
export const OPENROUTER_MODEL = getEnvVariable(
	"OPENROUTER_MODEL",
	"nvidia/nemotron-3-ultra-550b-a55b:free",
);
