import { getEnvVariable } from "../../utils/general.js";

function getPositiveIntegerEnv(name, fallback) {
	const value = Number(getEnvVariable(name, fallback));

	if (!Number.isInteger(value) || value <= 0) {
		throw new Error(`${name} must be a positive integer.`);
	}

	return value;
}

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
