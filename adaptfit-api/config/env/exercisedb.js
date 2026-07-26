import { getEnvVariable } from "../../utils/general.js";

export const EXERCISE_DB_RAPIDAPI_KEY = getEnvVariable(
	"EXERCISE_DB_RAPIDAPI_KEY",
);

export const EXERCISE_DB_RAPIDAPI_HOST = getEnvVariable(
	"EXERCISE_DB_RAPIDAPI_HOST",
	"edb-with-videos-and-images-by-ascendapi.p.rapidapi.com",
);

export const EXERCISE_DB_BASE_URL = getEnvVariable(
	"EXERCISE_DB_BASE_URL",
	"https://edb-with-videos-and-images-by-ascendapi.p.rapidapi.com/api/v1",
);
