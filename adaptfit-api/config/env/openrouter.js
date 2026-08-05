import { getEnvVariable, getPositiveIntegerEnv } from "../../utils/general.js";

export const OPENROUTER_API_KEY = getEnvVariable("OPENROUTER_API_KEY");
export const OPENROUTER_MODEL = getEnvVariable(
	"OPENROUTER_MODEL",
	"nvidia/nemotron-3-ultra-550b-a55b:free",
);
export const OPENROUTER_FALLBACK_MODEL = getEnvVariable(
	"OPENROUTER_FALLBACK_MODEL",
	"nvidia/nemotron-3-super-120b-a12b:free",
);
export const OPENROUTER_TIMEOUT_MS = getPositiveIntegerEnv(
	"OPENROUTER_TIMEOUT_MS",
	3 * 60 * 1000,
);
export const OPENROUTER_VALIDATION_TIMEOUT_MS = getPositiveIntegerEnv(
	"OPENROUTER_VALIDATION_TIMEOUT_MS",
	60 * 1000,
);
