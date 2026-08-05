import { Router } from "express";
import { isAuthenticated } from "../middleware/auth.js";
import { onboardingRateLimit } from "../middleware/rate_limit.js";
import { hasActiveSubscription } from "../middleware/subscription.js";
import * as z from "zod";
import {
	findActiveUserJob,
	GENERATE_PLAN_QUEUE_NAME,
} from "../services/tasks.js";
import { enqueuePlanGeneration } from "./plans_router.js";
import { REDO_COOLDOWN_MS } from "../config/env/onboarding.js";
import { validateOnboardingCustomFields } from "../services/onboarding-validation.js";

export const onboardingRouter = Router();

const weekdaySchema = z.enum([
	"Sunday",
	"Monday",
	"Tuesday",
	"Wednesday",
	"Thursday",
	"Friday",
	"Saturday",
]);

const OnboardingProfileSchema = z
	.object({
		age: z.coerce.number().int().min(13).max(100),
		biologicalSex: z.enum(["male", "female", "intersex", "prefer_not_to_say"]),
		height: z.coerce.number().int().min(100).max(250),
		currentWeight: z.coerce.number().int().min(45).max(300),
		primaryGoal: z.enum([
			"lose_weight",
			"build_muscle",
			"improve_endurance",
			"general_fitness",
			"build_strength",
			"improve_flexibility",
		]),
		goalTarget: z.string().optional(),
		experienceLevel: z.enum(["beginner", "intermediate", "advanced"]),
		injuriesOrLimitations: z.string().optional(),
		trainingLocation: z.enum(["home", "gym", "outdoors"]),
		equipmentAvailable: z
			.array(
				z.enum([
					"dumbbells",
					"barbell",
					"machines",
					"bands",
					"bodyweight",
					"bodyweight_only",
					"full_gym_access",
				]),
			)
			.min(1),
		machineTypes: z
			.array(
				z.enum([
					"cable_machine",
					"leg_press",
					"smith_machine",
					"lat_pulldown",
					"chest_press",
					"leg_curl_extension",
				]),
			)
			.default([]),
		customMachines: z.string().optional(),
		availableDays: z.array(weekdaySchema).min(1).max(7),
		preferredSessionLength: z.enum(["30", "45", "60", "60_plus"]),
		dietType: z.enum(["no_restrictions", "vegetarian", "vegan"]),
		allergiesOrFoodsToAvoid: z.string().optional(),
		mealFrequencyPreference: z.string().optional(),
	})
	.strict()
	.superRefine((profile, ctx) => {
		if (new Set(profile.availableDays).size !== profile.availableDays.length) {
			ctx.addIssue({
				code: "custom",
				path: ["availableDays"],
				message: "availableDays must not contain duplicate days",
			});
		}

		if (
			!profile.equipmentAvailable.includes("machines") &&
			profile.machineTypes.length > 0
		) {
			ctx.addIssue({
				code: "custom",
				path: ["machineTypes"],
				message: "machineTypes requires machines to be selected",
			});
		}

		if (
			profile.equipmentAvailable.includes("machines") &&
			profile.machineTypes.length <= 0 &&
			!profile.customMachines
		) {
			ctx.addIssue({
				code: "custom",
				path: ["customMachines"],
				message: "customMachines must be specified if no machines are selected",
			});
		}
	});

function formatValidationError(invalidFields, rejectionReasons = {}) {
	const count = invalidFields.length;
	const label = count === 1 ? "issue" : "issues";
	const reasons = invalidFields
		.map((field) => rejectionReasons[field])
		.filter(Boolean);

	if (reasons.length > 0) {
		return `You need to fix ${count} ${label}: ${reasons.join(" ")}`;
	}

	return `You need to fix ${count} ${label}: ${invalidFields.join(", ")}.`;
}

function validateProfile(profile) {
	if (!profile || typeof profile !== "object") {
		const error = new Error("Onboarding profile is required.");
		error.status = 400;
		throw error;
	}

	const parseResult = OnboardingProfileSchema.safeParse(profile);

	if (!parseResult.success) {
		const invalidFields = [
			...new Set(
				parseResult.error.issues
					.map((issue) => issue.path[0])
					.filter((field) => typeof field === "string"),
			),
		];

		const error = new Error(formatValidationError(invalidFields));
		error.status = 422;
		error.invalidFields = invalidFields;
		throw error;
	}

	return {
		...parseResult.data,
		equipmentAvailable: parseResult.data.equipmentAvailable.map((equipment) =>
			equipment === "bodyweight_only" ? "bodyweight" : equipment,
		),
	};
}

function isRedoCooldownActive(user) {
	const completedAt = user?.onboardingProfile?.completed_at;

	if (!completedAt) {
		return false;
	}

	return Date.now() - new Date(completedAt).getTime() < REDO_COOLDOWN_MS;
}

onboardingRouter.post(
	"/",
	isAuthenticated,
	hasActiveSubscription,
	onboardingRateLimit,
	async (req, res) => {
		try {
			if (req.user.hasGeneratedPlan && isRedoCooldownActive(req.user)) {
				return res.status(429).json({
					error:
						"You can redo onboarding once per day. Please try again tomorrow.",
				});
			}

			const profile = validateProfile(req.body?.profile);
			const validationResult = await validateOnboardingCustomFields(profile);
			const invalidFields = validationResult?.invalidFields || [];

			if (invalidFields.length > 0) {
				const rejectionReasons = validationResult?.rejectionReasons || {};
				const error = new Error(
					formatValidationError(invalidFields, rejectionReasons),
				);
				error.status = 422;
				error.invalidFields = invalidFields;
				error.rejectionReasons = rejectionReasons;
				throw error;
			}

			let planJob;

			try {
				planJob = await enqueuePlanGeneration(
					req.user.id,
					{ id: null, profile },
					null,
					true,
				);
			} catch (error) {
				if (error.status === 409 && error.jobId && error.statusUrl) {
					planJob = {
						jobId: error.jobId,
						statusUrl: error.statusUrl,
					};
				} else {
					throw error;
				}
			}

			return res.status(202).json({
				jobId: planJob.jobId,
				statusUrl: planJob.statusUrl,
			});
		} catch (error) {
			console.error(error);

			if (error.status) {
				return res.status(error.status).json({
					error: error.message,
					invalidFields: error.invalidFields,
					rejectionReasons: error.rejectionReasons,
					jobId: error.jobId,
					statusUrl: error.statusUrl,
				});
			}

			return res
				.status(503)
				.json({ error: "Onboarding could not be started." });
		}
	},
);

onboardingRouter.get(
	"/pending",
	isAuthenticated,
	hasActiveSubscription,
	async (req, res) => {
		try {
			const planJob = await findActiveUserJob(
				GENERATE_PLAN_QUEUE_NAME,
				req.user.id,
			);

			if (planJob) {
				return res.json({
					pending: true,
					queueName: GENERATE_PLAN_QUEUE_NAME,
					...planJob,
				});
			}

			return res.json({ pending: false });
		} catch (error) {
			console.error(error);
			return res
				.status(503)
				.json({ error: "Pending onboarding status could not be loaded." });
		}
	},
);
