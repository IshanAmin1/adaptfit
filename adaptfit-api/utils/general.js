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
