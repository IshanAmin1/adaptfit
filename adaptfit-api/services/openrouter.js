import {
	OPENROUTER_API_KEY,
	OPENROUTER_FALLBACK_MODEL,
	OPENROUTER_MODEL,
} from "../config/env/openrouter.js";

const OPENROUTER_LOG_BODY_LIMIT = 2000;

function createAiUnavailableError(message) {
	const error = new Error(message);
	error.status = 503;
	return error;
}

function getOpenRouterBodySummary(body) {
	return JSON.stringify(body).slice(0, OPENROUTER_LOG_BODY_LIMIT);
}

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

	const startedAt = Date.now();
	const { requestLabel = "openrouter", ...requestArgs } = args;
	let response;
	const requestedModels = [OPENROUTER_MODEL, OPENROUTER_FALLBACK_MODEL].filter(
		Boolean,
	);

	console.log(
		`OpenRouter request started label=${requestLabel} models=${requestedModels.join(
			",",
		)}`,
	);

	try {
		response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
			method: "POST",
			headers: {
				Authorization: `Bearer ${OPENROUTER_API_KEY}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				models: requestedModels,
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
				...requestArgs,
			}),
		});
	} catch (error) {
		console.error(
			`OpenRouter fetch failed label=${requestLabel} after ${
				Date.now() - startedAt
			}ms:`,
			error,
		);
		return null;
	}

	if (!response.ok) {
		const errorText = await response.text().catch(() => "");
		console.error(
			`OpenRouter query failed label=${requestLabel} status=${
				response.status
			} after ${
				Date.now() - startedAt
			}ms: ${errorText.slice(0, OPENROUTER_LOG_BODY_LIMIT)}`,
		);
		return null;
	}

	const responseText = await response.text().catch(() => "");
	let body;

	try {
		body = JSON.parse(responseText);
	} catch (error) {
		console.error(
			`OpenRouter returned invalid JSON label=${requestLabel} status=${
				response.status
			} after ${Date.now() - startedAt}ms: ${responseText.slice(
				0,
				OPENROUTER_LOG_BODY_LIMIT,
			)}`,
			error,
		);
		return null;
	}

	const content = body?.choices?.[0]?.message?.content;
	const finishReason = body?.choices?.[0]?.finish_reason;

	console.log(
		`OpenRouter query completed label=${requestLabel} status=${
			response.status
		} after ${Date.now() - startedAt}ms model=${body?.model || "unknown"} provider=${
			body?.provider || "unknown"
		} finishReason=${finishReason || "unknown"} hasContent=${Boolean(content)}`,
	);

	if (!content) {
		console.error(
			`OpenRouter returned no message content label=${requestLabel} status=${
				response.status
			} after ${
				Date.now() - startedAt
			}ms model=${body?.model || "unknown"} provider=${
				body?.provider || "unknown"
			} finishReason=${finishReason || "unknown"} body=${getOpenRouterBodySummary(
				body,
			)}`,
		);
	}

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

		if (!content) {
			throw createAiUnavailableError(
				"AI request is temporarily unavailable. Please try again at a later time.",
			);
		} else if (!shouldRetry(content)) {
			result = content;
			break;
		} else {
			retries--;
		}
	}

	if (!result) {
		throw createAiUnavailableError(
			"AI returned an invalid response. Please try again.",
		);
	}

	return result;
}
