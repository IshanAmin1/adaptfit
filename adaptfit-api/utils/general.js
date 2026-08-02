export function getEnvVariable(name, fallback) {
	const envVar = process.env[name];
	if (!envVar) {
		if (fallback) {
			return fallback;
		}
		throw new Error(`${name} is not configured.`);
	}

	return envVar;
}

export function getPositiveIntegerEnv(name, fallback) {
	const value = Number(getEnvVariable(name, fallback));

	if (!Number.isInteger(value) || value <= 0) {
		throw new Error(`${name} must be a positive integer.`);
	}

	return value;
}

export function getNonNegativeIntegerEnv(name, fallback) {
	const value = Number(getEnvVariable(name, fallback));

	if (!Number.isInteger(value) || value < 0) {
		throw new Error(`${name} must be a non-negative integer.`);
	}

	return value;
}
