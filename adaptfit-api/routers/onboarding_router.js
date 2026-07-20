import { Router } from "express";
import { isAuthenticated } from "../middleware/auth.js";
import { hasActiveSubscription } from "../middleware/subscription.js";
import * as z from "zod";
import {
	getQueueWithListener,
	VALIDATE_ONBOARDING_QUEUE_NAME,
} from "../services/tasks.js";

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

			const parseResult = OnboardingProfileSchema.safeParse(profile);

			if (!parseResult.success) {
				const invalidFields = [
					...new Set(
						parseResult.error.issues
							.map((issue) => issue.path[0])
							.filter((field) => typeof field === "string"),
					),
				];

				return res.status(422).json({
					error: formatValidationError(invalidFields),
					invalidFields,
				});
			}

			const { queue } = getQueueWithListener(VALIDATE_ONBOARDING_QUEUE_NAME);
			const job = await queue.add(
				`${VALIDATE_ONBOARDING_QUEUE_NAME}-${req.user.id}`,
				parseResult.data,
			);

			return res.status(202).json({
				job_id: job.id,
				status: "processing",
				status_url: "<status_url>",
			});
		} catch (error) {
			console.error(error);
			return res
				.status(503)
				.json({ error: "Onboarding validation could not be completed." });
		}
	},
);
