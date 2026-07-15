import { Router } from "express";
import { isAuthenticated } from "../middleware/auth.js";
import { saveOnboardingProfile } from "../models/onboarding.js";
import { hasActiveSubscription } from "../middleware/subscription.js";
import { getBillingStatusForUser } from "../models/subscriptions.js";
import { serializeUser } from "../models/users.js";

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

function hasRequiredOnboardingFields(profile) {
	return REQUIRED_FIELDS.every((field) => {
		const value = profile?.[field];

		if (Array.isArray(value)) {
			return value.length > 0;
		}

		return value !== undefined && value !== null && value !== "";
	});
}

function getValidationError(profile) {
	const hasValidNumbers = INTEGER_FIELDS.every((field) => {
		const value = Number(profile?.[field]);
		const [min, max] = NUMBER_RANGES[field];
		return Number.isInteger(value) && value >= min && value <= max;
	});

	if (!hasValidNumbers) {
		return "Numeric onboarding fields are invalid.";
	}

	const hasValidOptions = Object.entries(VALID_OPTIONS).every(
		([field, options]) => options.includes(profile?.[field]),
	);

	if (!hasValidOptions) {
		return "One or more selected options are invalid.";
	}

	const hasValidEquipment = profile.equipmentAvailable.every((item) =>
		VALID_EQUIPMENT.includes(item),
	);

	if (!hasValidEquipment) {
		return "Equipment contains an invalid option.";
	}

	const machineTypes = profile.machineTypes || [];
	const hasValidMachines =
		Array.isArray(machineTypes) &&
		machineTypes.every((item) => VALID_MACHINES.includes(item));

	if (!hasValidMachines) {
		return "Machine types contain an invalid option.";
	}

	if (
		!profile.equipmentAvailable.includes("machines") &&
		machineTypes.length > 0
	) {
		return "Machine types require machines to be selected.";
	}

	return null;
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

			const validationError = getValidationError(profile);

			if (validationError) {
				return res.status(400).json({ error: validationError });
			}

			const user = await saveOnboardingProfile(req.user.id, profile);

			if (!user) {
				return res.status(404).json({ error: "User could not be found." });
			}

			const billingStatus = await getBillingStatusForUser(user.id);
			return res.json({ user: serializeUser(user, billingStatus) });
		} catch (error) {
			console.error(error);
			return res.status(500).json({ error: "Onboarding could not be saved." });
		}
	},
);
