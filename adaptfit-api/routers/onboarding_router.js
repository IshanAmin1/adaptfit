import { Router } from "express";
import { isAuthenticated } from "../middleware/auth.js";
import { hasActiveSubscription } from "../middleware/subscription.js";
import { getBillingStatusForUser } from "../models/subscriptions.js";
import { saveOnboardingProfile } from "../models/onboarding.js";
import { serializeUser } from "../models/users.js";
import {
	OPENROUTER_API_KEY,
	OPENROUTER_API_URL,
	OPENROUTER_MODEL,
} from "../config/openrouter.js";

export const onboardingRouter = Router();

const REQUIRED_FIELDS = [
	"age",
	"biologicalSex",
	"height",
	"currentWeight",
	"primaryGoal",
	"experienceLevel",
	"trainingLocation",
	"equipmentAvailable",
	"daysPerWeek",
	"preferredSessionLength",
	"dietType",
];

const INTEGER_FIELDS = ["age", "height", "currentWeight", "daysPerWeek"];

const NUMBER_RANGES = {
	age: [13, 100],
	height: [100, 250],
	currentWeight: [30, 300],
	daysPerWeek: [1, 7],
};

const VALID_OPTIONS = {
	biologicalSex: ["male", "female", "intersex", "prefer_not_to_say"],
	primaryGoal: [
		"lose_weight",
		"build_muscle",
		"improve_endurance",
		"general_fitness",
		"build_strength",
		"improve_flexibility",
	],
	experienceLevel: ["beginner", "intermediate", "advanced"],
	trainingLocation: ["home", "gym", "outdoors"],
	preferredSessionLength: ["30", "45", "60", "60_plus"],
	dietType: ["no_restrictions", "vegetarian", "vegan"],
};

const VALID_EQUIPMENT = [
	"dumbbells",
	"barbell",
	"machines",
	"bands",
	"bodyweight_only",
	"full_gym_access",
];

const VALID_MACHINES = [
	"cable_machine",
	"leg_press",
	"smith_machine",
	"lat_pulldown",
	"chest_press",
	"leg_curl_extension",
];

const AI_VALIDATION_FIELD_NAMES = [
	"targetWeightOrTimeline",
	"injuriesOrLimitations",
	"machineTypes",
	"customMachines",
	"allergiesOrFoodsToAvoid",
	"mealFrequencyPreference",
];

function hasRequiredOnboardingFields(profile) {
	return REQUIRED_FIELDS.every((field) => {
		const value = profile?.[field];

		if (Array.isArray(value)) {
			return value.length > 0;
		}

		return value !== undefined && value !== null && value !== "";
	});
}

function getLocalValidationIssues(profile) {
	const issues = [];

	for (const field of INTEGER_FIELDS) {
		const value = Number(profile?.[field]);
		const [min, max] = NUMBER_RANGES[field];

		if (!Number.isInteger(value) || value < min || value > max) {
			issues.push(field);
		}
	}

	for (const [field, options] of Object.entries(VALID_OPTIONS)) {
		if (!options.includes(profile?.[field])) {
			issues.push(field);
		}
	}

	if (
		!Array.isArray(profile?.equipmentAvailable) ||
		profile.equipmentAvailable.length === 0 ||
		!profile.equipmentAvailable.every((item) => VALID_EQUIPMENT.includes(item))
	) {
		issues.push("equipmentAvailable");
	}

	const machineTypes = Array.isArray(profile?.machineTypes)
		? profile.machineTypes
		: [];

	if (!machineTypes.every((item) => VALID_MACHINES.includes(item))) {
		issues.push("machineTypes");
	}

	if (
		Array.isArray(profile?.equipmentAvailable) &&
		!profile.equipmentAvailable.includes("machines") &&
		machineTypes.length > 0
	) {
		issues.push("machineTypes");
	}

	return [...new Set(issues)];
}

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

function extractInvalidFields(content) {
	if (Array.isArray(content)) {
		return content.filter((item) => typeof item === "string");
	}

	if (typeof content === "string") {
		try {
			const parsed = JSON.parse(content);

			if (Array.isArray(parsed)) {
				return parsed.filter((item) => typeof item === "string");
			}

			if (parsed && Array.isArray(parsed.invalidFields)) {
				return parsed.invalidFields.filter((item) => typeof item === "string");
			}
		} catch {
			return [];
		}
	}

	if (
		content &&
		typeof content === "object" &&
		Array.isArray(content.invalidFields)
	) {
		return content.invalidFields.filter((item) => typeof item === "string");
	}

	return [];
}

function formatValidationError(invalidFields) {
	const count = invalidFields.length;
	const label = count === 1 ? "issue" : "issues";

	return `You need to fix ${count} ${label}: ${invalidFields.join(", ")}.`;
}

async function validateOnboardingWithOpenRouter(profile) {
	const response = await fetch(OPENROUTER_API_URL, {
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
					content:
						"You validate onboarding details and return only JSON. The JSON must be an array of field names that are incorrect.",
				},
				{
					role: "user",
					content: buildValidationPrompt(profile),
				},
			],
			response_format: {
				type: "json_schema",
				json_schema: {
					name: "onboarding_validation",
					schema: {
						type: "array",
						items: {
							type: "string",
							enum: AI_VALIDATION_FIELD_NAMES,
						},
					},
				},
			},
			temperature: 0,
		}),
	});

	if (!response.ok) {
		throw new Error(
			`OpenRouter validation failed with status ${response.status}.`,
		);
	}

	const body = await response.json();
	const content = body?.choices?.[0]?.message?.content;
	return extractInvalidFields(content);
}

onboardingRouter.post(
	"/",
	isAuthenticated,
	hasActiveSubscription,
	async (req, res) => {
		try {
			const profile = req.body?.profile;

			if (!profile || typeof profile !== "object") {
				return res
					.status(400)
					.json({ error: "Onboarding profile is required." });
			}

			if (!hasRequiredOnboardingFields(profile)) {
				return res
					.status(400)
					.json({ error: "Required onboarding fields are missing." });
			}

			const localIssues = getLocalValidationIssues(profile);

			if (localIssues.length > 0) {
				return res.status(422).json({
					error: formatValidationError(localIssues),
					invalidFields: localIssues,
				});
			}

			const invalidFields = await validateOnboardingWithOpenRouter(profile);

			if (invalidFields.length > 0) {
				return res.status(422).json({
					error: formatValidationError(invalidFields),
					invalidFields,
				});
			}

			const user = await saveOnboardingProfile(req.user.id, profile);

			if (!user) {
				return res.status(404).json({ error: "User could not be found." });
			}

			const billingStatus = await getBillingStatusForUser(user.id);
			return res.json({ user: serializeUser(user, billingStatus) });
		} catch (error) {
			console.error(error);
			return res
				.status(503)
				.json({ error: "Onboarding validation could not be completed." });
		}
	},
);
