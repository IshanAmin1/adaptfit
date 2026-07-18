import { getEnvVariable } from "../utils/general.js";

export const OPENROUTER_API_KEY = getEnvVariable("OPENROUTER_API_KEY");
export const OPENROUTER_API_URL =
	"https://openrouter.ai/api/v1/chat/completions";
export const OPENROUTER_MODEL = "nvidia/nemotron-3-ultra-550b-a55b:free";
