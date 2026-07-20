import {
	OPENROUTER_API_KEY,
	OPENROUTER_MODEL,
} from "../config/env/openrouter.js";

/**
 * Query an OpenRouter model
 * @param {string} systemPrompt - System prompt
 * @param {string} userPrompt - User prompt
 * @param {*} outputSchema - Zod schema for the expected output
 * @param {*} args - Object containing extra args to pass to OpenRouter
 * @returns
 */
export async function queryModel(systemPrompt, userPrompt, args = {}) {
	if (!systemPrompt || !userPrompt) {
		return null;
	}

	const response = await fetch(
		"https://openrouter.ai/api/v1/chat/completions",
		{
			method: "POST",
			headers: {
				Authorization: `Bearer ${OPENROUTER_API_KEY}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				model: OPENROUTER_MODEL,
				messages: [
					{
						role: "system",
						content: systemPrompt,
					},
					{
						role: "user",
						content: userPrompt,
					},
				],
				temperature: 0,
				...args,
			}),
		},
	);

	if (!response.ok) {
		// Query failed
		console.error(
			`OpenRouter query request failed with status ${response.status}.`,
		);
		return null;
	}

	const body = await response.json();
	const content = body?.choices?.[0]?.message?.content;

	return content;
}

/**
 * Query an OpenRouter model with retries
 * @param {string} systemPrompt - System prompt
 * @param {string} userPrompt - User prompt
 * @param {(output: any) => boolean} shouldRetry - Function that determines when to retry
 * @param {number} retries - Number of retries, default = 1
 * @param {*} args - Object containing extra args to pass to OpenRouter
 * @returns
 */
export async function queryModelWithRetries(
	systemPrompt,
	userPrompt,
	shouldRetry,
	retries = 1,
	args = {},
) {
	if (!systemPrompt || !userPrompt || !shouldRetry) {
		return null;
	}

	let result = null;
	while (retries > 0) {
		const content = await queryModel(systemPrompt, userPrompt, args);

		if (content && !shouldRetry(content)) {
			result = content;
			break;
		} else {
			retries--;
		}
	}

	return result;
}
