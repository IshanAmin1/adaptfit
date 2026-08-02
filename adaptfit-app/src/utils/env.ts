export function getEnvVariable(
	value: string | undefined,
	name: string,
	fallback?: string,
) {
	if (value === undefined || value === "") {
		if (fallback !== undefined) {
			return fallback;
		}

		throw new Error(`${name} is not configured.`);
	}

	return value;
}

export function getNonNegativeIntegerEnv(
	value: string | undefined,
	name: string,
	fallback: number,
) {
	const parsed = Number(getEnvVariable(value, name, String(fallback)));

	if (!Number.isInteger(parsed) || parsed < 0) {
		throw new Error(`${name} must be a non-negative integer.`);
	}

	return parsed;
}
