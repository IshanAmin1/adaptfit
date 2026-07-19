import "dotenv/config";
import { Worker } from "bullmq";
import { sequelize } from "../datasource.js";
import { queryModelWithRetries } from "../services/openrouter.js";
import * as z from "zod";

import { VALIDATE_ONBOARDING_QUEUE_NAME } from "../services/tasks.js";
import { REDIS_HOST, REDIS_PORT } from "../config/env/storage.js";

try {
	await sequelize.authenticate();
	console.log("Connection has been established successfully.");
} catch (error) {
	console.error("Unable to connect to the database:", error);
}

const AI_VALIDATION_FIELD_NAMES = [
	"targetWeightOrTimeline",
	"injuriesOrLimitations",
	"machineTypes",
	"customMachines",
	"allergiesOrFoodsToAvoid",
	"mealFrequencyPreference",
];

function buildValidationPrompt(profile) {
	return [
		"You validate onboarding details for a AI workout plan generator app.",
		"Return only a JSON array of incorrect field names.",
		"Do not include markdown, explanations, or any extra keys.",
		`Field names to validate: ${AI_VALIDATION_FIELD_NAMES.join(", ")}.`,
		"Mark a field as incorrect when it is invalid, impossible, or conflicts with another field.",
		"Note that it is okay if the field is empty or not present.",
		"Use the app rules in the profile as context and return [] when everything looks correct.",
		`Profile: ${JSON.stringify(profile)}`,
	].join("\n");
}

async function verifyOnboarding(profile) {
	const content = await queryModelWithRetries(
		"You validate onboarding details and return only valid JSON. The JSON must be an array of field names that are incorrect. The field names must be strings.",
		buildValidationPrompt(profile),
		z.array(z.enum(AI_VALIDATION_FIELD_NAMES)),
	);

	if (content) {
		return content;
	} else {
		throw Error("Model could not produce a valid output.");
	}
}

new Worker(
	VALIDATE_ONBOARDING_QUEUE_NAME,
	async (job) => verifyOnboarding(job.data),
	{
		connection: {
			host: REDIS_HOST,
			port: REDIS_PORT,
		},
	},
);
