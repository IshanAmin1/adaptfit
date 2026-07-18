export function getEnvVariable(name) {
	const envVar = process.env[name];
	if (!envVar) {
		throw new Error(`${name} is not configured.`);
	}

	return envVar;
}
