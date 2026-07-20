import { Router } from "express";
import { isAuthenticated } from "../middleware/auth.js";
import { hasActiveSubscription } from "../middleware/subscription.js";
import * as z from "zod";
import {
	getQueueWithListener,
	VALIDATE_ONBOARDING_QUEUE_NAME,
} from "../services/tasks.js";
import { streamQueueJobStatus } from "../middleware/queue_status_stream.js";
import { saveOnboardingProfile } from "../utils/models/onboarding.js";
import { getBillingStatusForUser } from "../utils/models/subscriptions.js";
import { serializeUser } from "../utils/models/users.js";

export const onboardingRouter = Router();

const OnboardingProfileSchema = z
	.object({
		age: z.coerce.number().int().min(13).max(100),
		biologicalSex: z.enum(["male", "female", "intersex", "prefer_not_to_say"]),
		height: z.coerce.number().int().min(100).max(250),
		currentWeight: z.coerce.number().int().min(30).max(300),
		primaryGoal: z.enum([
			"lose_weight",
			"build_muscle",
			"improve_endurance",
			"general_fitness",
			"build_strength",
			"improve_flexibility",
		]),
		targetWeightOrTimeline: z.string().optional(),
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
		daysPerWeek: z.coerce.number().int().min(1).max(7),
		preferredSessionLength: z.enum(["30", "45", "60", "60_plus"]),
		dietType: z.enum(["no_restrictions", "vegetarian", "vegan"]),
		allergiesOrFoodsToAvoid: z.string().optional(),
		mealFrequencyPreference: z.string().optional(),
	})
	.strict()
	.superRefine((profile, ctx) => {
		if (
			!profile.equipmentAvailable.includes("machines") &&
			profile.machineTypes.length > 0
		) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["machineTypes"],
				message: "machineTypes requires machines to be selected",
			});
		}
	});

function formatValidationError(invalidFields) {
	const count = invalidFields.length;
	const label = count === 1 ? "issue" : "issues";

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

	return parseResult.data;
}

async function completeOnboardingFromValidationResult(
	validationResult,
	profile,
	userId,
	sendProgress,
) {
	const invalidFields = validationResult?.invalidFields || [];

	if (invalidFields.length > 0) {
		const error = new Error(formatValidationError(invalidFields));
		error.status = 422;
		error.invalidFields = invalidFields;
		throw error;
	}

	sendProgress({
		stage: "saving",
		message: "Saving your onboarding profile.",
	});

	const user = await saveOnboardingProfile(userId, profile);

	if (!user) {
		const error = new Error("User could not be found.");
		error.status = 404;
		throw error;
	}

	const billingStatus = await getBillingStatusForUser(user.id);
	const serializedUser = serializeUser(user, billingStatus);

	sendProgress({
		stage: "complete",
		message: "Your onboarding profile is ready.",
	});

	return serializedUser;
}

onboardingRouter.post(
	"/",
	isAuthenticated,
	hasActiveSubscription,
	async (req, res) => {
		try {
			const profile = validateProfile(req.body?.profile);
			const { queue } = getQueueWithListener(VALIDATE_ONBOARDING_QUEUE_NAME);
			const job = await queue.add(
				`${VALIDATE_ONBOARDING_QUEUE_NAME}-${req.user.id}`,
				{ userId: req.user.id, profile },
			);

			return res.status(202).json({
				jobId: job.id,
				statusUrl: `/onboarding/status/${job.id}/stream`,
			});
		} catch (error) {
			console.error(error);

			if (error.status) {
				return res.status(error.status).json({
					error: error.message,
					invalidFields: error.invalidFields,
				});
			}

			return res
				.status(503)
				.json({ error: "Onboarding validation could not be started." });
		}
	},
);

onboardingRouter.get(
	"/status/:jobId/stream",
	isAuthenticated,
	hasActiveSubscription,
	streamQueueJobStatus(
		VALIDATE_ONBOARDING_QUEUE_NAME,
		async ({ req, job, returnvalue, send }) => {
			const user = await completeOnboardingFromValidationResult(
				returnvalue,
				job.data.profile,
				req.user.id,
				(event) => {
					send({ type: "progress", ...event });
				},
			);

			send({ type: "complete", user });
		},
	),
);
