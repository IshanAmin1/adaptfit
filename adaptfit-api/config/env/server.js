import { getEnvVariable, getPositiveIntegerEnv } from "../../utils/general.js";

export const PORT = getEnvVariable("PORT", 3000);
export const CLIENT_ORIGIN = getEnvVariable("CLIENT_ORIGIN");
export const STATUS_STREAM_HEARTBEAT_MS = getPositiveIntegerEnv(
	"STATUS_STREAM_HEARTBEAT_MS",
	15000,
);
export const STATUS_STREAM_TIMEOUT_MS = getPositiveIntegerEnv(
	"STATUS_STREAM_TIMEOUT_MS",
	10 * 60 * 1000,
);
