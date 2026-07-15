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

function hasRequiredOnboardingFields(profile) {
	return REQUIRED_FIELDS.every((field) => {
		const value = profile?.[field];

		if (Array.isArray(value)) {
			return value.length > 0;
		}

		return value !== undefined && value !== null && value !== "";
	});
}

function hasValidIntegerFields(profile) {
	return INTEGER_FIELDS.every((field) => {
		const value = Number(profile?.[field]);
		return Number.isInteger(value);
	});
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

			if (!hasValidIntegerFields(profile)) {
				return res
					.status(400)
					.json({ error: "Numeric onboarding fields must be whole numbers." });
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
