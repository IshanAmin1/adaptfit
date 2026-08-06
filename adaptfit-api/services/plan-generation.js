import * as z from "zod";
import { sequelize } from "../datasource.js";
import { queryModelWithRetries } from "./openrouter.js";
import {
	findLatestPlanForUser,
	saveGeneratedPlan,
} from "../utils/models/plans.js";
import { saveOnboardingProfile } from "../utils/models/onboarding.js";
import { findRecentWorkoutLogsForUser } from "../utils/models/workout_logs.js";
import { getBillingStatusForUser } from "../utils/models/subscriptions.js";
import { findUsersWithCompletedOnboarding } from "../utils/models/users.js";

const ExerciseSchema = z.object({
	exercise_name: z.string(),
	target_muscle_group: z.string(),
	sets: z.number(),
	reps: z.string(),
	equipment_needed: z.array(z.string()),
});

const WeeklyScheduleSchema = z.array(
	z.object({
		day: z.string(),
		session_type: z.string(),
		duration_minutes: z.number(),
		exercises: z.array(ExerciseSchema),
	}),
);

const AdaptiveNotesSchema = z.object({
	adjustment_triggers: z.array(z.string()),
});

const PlanSchema = z.object({
	plan_metadata: z.object({
		generated_at: z.string(),
		plan_version: z.string(),
		user_goal: z.string(),
	}),
	user_summary: z.object({
		bmi: z.number(),
		bmr: z.number(),
		tdee: z.number(),
		target_physique_description: z.string(),
	}),
	nutrition_plan: z.object({
		daily_calories: z.number(),
		macros: z.object({
			protein_g: z.number(),
			carbs_g: z.number(),
			fat_g: z.number(),
		}),
		meal_frequency: z.number(),
		sample_meals: z.array(
			z.object({
				meal_name: z.string(),
				description: z.string(),
				estimated_calories: z.number(),
			}),
		),
	}),
	weekly_schedule: WeeklyScheduleSchema,
	adaptive_notes: AdaptiveNotesSchema,
});

const InitialNutritionModelSchema = z.object({
	user_summary: z.object({
		target_physique_description: z.string(),
	}),
	nutrition_plan: z.object({
		daily_calories: z.number(),
		macros: z.object({
			protein_g: z.number(),
			carbs_g: z.number(),
			fat_g: z.number(),
		}),
		meal_frequency: z.number(),
		sample_meals: z.tuple([
			z.object({
				meal_name: z.string(),
				description: z.string(),
				estimated_calories: z.number(),
			}),
		]),
	}),
});

const InitialWorkoutModelSchema = z.object({
	weekly_schedule: WeeklyScheduleSchema,
	adaptive_notes: AdaptiveNotesSchema,
});

const AdaptivePlanSchema = z.object({
	weekly_schedule: WeeklyScheduleSchema,
	adaptive_notes: AdaptiveNotesSchema,
});

const exerciseJsonSchema = {
	type: "object",
	additionalProperties: false,
	required: [
		"exercise_name",
		"target_muscle_group",
		"sets",
		"reps",
		"equipment_needed",
	],
	properties: {
		exercise_name: { type: "string" },
		target_muscle_group: { type: "string" },
		sets: { type: "number" },
		reps: { type: "string" },
		equipment_needed: {
			type: "array",
			items: { type: "string" },
		},
	},
};

const weeklyScheduleJsonSchema = {
	type: "array",
	items: {
		type: "object",
		additionalProperties: false,
		required: ["day", "session_type", "duration_minutes", "exercises"],
		properties: {
			day: { type: "string" },
			session_type: { type: "string" },
			duration_minutes: { type: "number" },
			exercises: {
				type: "array",
				items: exerciseJsonSchema,
			},
		},
	},
};

const adaptiveNotesJsonSchema = {
	type: "object",
	additionalProperties: false,
	required: ["adjustment_triggers"],
	properties: {
		adjustment_triggers: {
			type: "array",
			items: { type: "string" },
		},
	},
};

const NUTRITION_JSON_SCHEMA = {
	type: "object",
	additionalProperties: false,
	required: ["user_summary", "nutrition_plan"],
	properties: {
		user_summary: {
			type: "object",
			additionalProperties: false,
			required: ["target_physique_description"],
			properties: {
				target_physique_description: { type: "string" },
			},
		},
		nutrition_plan: {
			type: "object",
			additionalProperties: false,
			required: ["daily_calories", "macros", "meal_frequency", "sample_meals"],
			properties: {
				daily_calories: { type: "number" },
				macros: {
					type: "object",
					additionalProperties: false,
					required: ["protein_g", "carbs_g", "fat_g"],
					properties: {
						protein_g: { type: "number" },
						carbs_g: { type: "number" },
						fat_g: { type: "number" },
					},
				},
				meal_frequency: { type: "number" },
				sample_meals: {
					type: "array",
					minItems: 1,
					maxItems: 1,
					items: {
						type: "object",
						additionalProperties: false,
						required: ["meal_name", "description", "estimated_calories"],
						properties: {
							meal_name: { type: "string" },
							description: { type: "string" },
							estimated_calories: { type: "number" },
						},
					},
				},
			},
		},
	},
};

const INITIAL_WORKOUT_JSON_SCHEMA = {
	type: "object",
	additionalProperties: false,
	required: ["weekly_schedule", "adaptive_notes"],
	properties: {
		weekly_schedule: weeklyScheduleJsonSchema,
		adaptive_notes: adaptiveNotesJsonSchema,
	},
};

const ADAPTIVE_PLAN_JSON_SCHEMA = {
	type: "object",
	additionalProperties: false,
	required: ["weekly_schedule", "adaptive_notes"],
	properties: {
		weekly_schedule: weeklyScheduleJsonSchema,
		adaptive_notes: adaptiveNotesJsonSchema,
	},
};

const NUTRITION_SYSTEM_PROMPT = [
	"Generate AdaptFit nutrition JSON only. Match schema exactly; no markdown.",
	"Numbers must be numeric. No medical diagnosis/advice.",
	"Use Mifflin-St Jeor with activity from workout days. Respect diet/allergies.",
	"target_physique_description: one neutral goal sentence, no appearance likeness.",
	"Return exactly one practical sample meal with 3-5 foods.",
].join("\n");

const WORKOUT_SYSTEM_PROMPT = [
	"Generate AdaptFit workout JSON only. Match schema exactly; no markdown.",
	"Numbers must be numeric. Respect location, equipment, days, injuries.",
	"Use only selected workout days. Avoid unsafe exercises for stated limitations.",
	"Exercises per workout: 30m=2-3, 45m=3-4, 60+=4-6.",
	"Prefer concise common exercise names. Bodyweight is allowed when appropriate.",
].join("\n");

const ADAPTIVE_SYSTEM_PROMPT = [
	"Adapt only workout JSON. Match schema exactly; no markdown.",
	"Keep changes conservative and based on workout logs.",
	"Respect location, equipment, days, injuries. Use only selected workout days.",
	"Exercises per workout: 30m=2-3, 45m=3-4, 60+=4-6.",
].join("\n");

// Prompt helpers
const optionalValue = (value) =>
	value && String(value).trim() ? value : "not provided";

function getPreviousPlan(adaptationContext) {
	const previousPlan = adaptationContext.previousPlan;

	if (previousPlan?.plan) {
		return previousPlan.plan;
	}

	return {
		plan_metadata: previousPlan.metadata,
		user_summary: previousPlan.targets,
		nutrition_plan: previousPlan.nutrients,
		weekly_schedule: previousPlan.schedule,
		adaptive_notes: previousPlan.adaptiveNotes,
	};
}

function parsePlanOutput(schema, output) {
	try {
		return schema.parse(JSON.parse(output));
	} catch {
		return null;
	}
}

function requirePlanOutputRetry(schema, output) {
	return !parsePlanOutput(schema, output);
}

function buildInitialNutritionPrompt(profile) {
	return [
		"Create nutrition + summary.",
		buildNutritionProfilePromptSection(profile),
		"Return JSON only.",
	].join("\n");
}

function buildInitialWorkoutPrompt(profile) {
	return [
		"Create weekly_schedule + adaptive_notes.",
		buildWorkoutProfilePromptSection(profile),
		"Return JSON only.",
	].join("\n");
}

async function generateModelOutput({
	systemPrompt,
	prompt,
	responseSchema,
	jsonSchema,
	requestLabel,
}) {
	const content = await queryModelWithRetries(
		systemPrompt,
		prompt,
		(output) => requirePlanOutputRetry(responseSchema, output),
		1,
		{
			requestLabel,
			response_format: {
				type: "json_schema",
				json_schema: {
					name: "adaptfit_weekly_plan",
					schema: jsonSchema,
				},
			},
		},
	);

	return responseSchema.parse(JSON.parse(content));
}

async function generateInitialModelPlan(profile, job) {
	await job.updateProgress({
		stage: "nutrition_generation",
		message: "Generating your nutrition targets.",
	});

	const nutritionPlan = await generateModelOutput({
		systemPrompt: NUTRITION_SYSTEM_PROMPT,
		prompt: buildInitialNutritionPrompt(profile),
		responseSchema: InitialNutritionModelSchema,
		jsonSchema: NUTRITION_JSON_SCHEMA,
		requestLabel: "initial-nutrition-generation",
	});

	await job.updateProgress({
		stage: "workout_generation",
		message: "Generating your workout schedule.",
	});

	const workoutPlan = await generateModelOutput({
		systemPrompt: WORKOUT_SYSTEM_PROMPT,
		prompt: buildInitialWorkoutPrompt(profile),
		responseSchema: InitialWorkoutModelSchema,
		jsonSchema: INITIAL_WORKOUT_JSON_SCHEMA,
		requestLabel: "initial-workout-generation",
	});

	return {
		user_summary: nutritionPlan.user_summary,
		nutrition_plan: nutritionPlan.nutrition_plan,
		weekly_schedule: workoutPlan.weekly_schedule,
		adaptive_notes: workoutPlan.adaptive_notes,
	};
}

async function generateAdaptiveModelPlan(modelRequest) {
	return generateModelOutput({
		systemPrompt: modelRequest.systemPrompt,
		prompt: modelRequest.prompt,
		responseSchema: modelRequest.responseSchema,
		jsonSchema: modelRequest.jsonSchema,
		requestLabel: "adaptive-plan-generation",
	});
}

function buildModelRequest(profile, adaptationContext) {
	if (adaptationContext) {
		return {
			systemPrompt: ADAPTIVE_SYSTEM_PROMPT,
			prompt: buildAdaptivePlanPrompt(profile, adaptationContext),
			responseSchema: AdaptivePlanSchema,
			jsonSchema: ADAPTIVE_PLAN_JSON_SCHEMA,
		};
	}

	return {
		systemPrompt: WORKOUT_SYSTEM_PROMPT,
		prompt: [
			"Create weekly_schedule + adaptive_notes.",
			buildWorkoutProfilePromptSection(profile),
			"Return JSON only.",
		].join("\n"),
		responseSchema: InitialWorkoutModelSchema,
		jsonSchema: INITIAL_WORKOUT_JSON_SCHEMA,
	};
}

function roundToOneDecimal(value) {
	return Math.round(value * 10) / 10;
}

function getBmrSexConstant(biologicalSex) {
	if (biologicalSex === "male") {
		return 5;
	}

	if (biologicalSex === "female") {
		return -161;
	}

	return -78;
}

function getActivityMultiplier(availableDays = []) {
	const trainingDays = availableDays.length;

	if (trainingDays <= 2) {
		return 1.375;
	}

	if (trainingDays <= 4) {
		return 1.55;
	}

	return 1.725;
}

function calculateUserTargets(profile) {
	const heightMeters = profile.height / 100;
	const bmi = roundToOneDecimal(profile.currentWeight / heightMeters ** 2);
	const bmr = roundToOneDecimal(
		10 * profile.currentWeight +
			6.25 * profile.height -
			5 * profile.age +
			getBmrSexConstant(profile.biologicalSex),
	);
	const tdee = roundToOneDecimal(
		bmr * getActivityMultiplier(profile.availableDays || []),
	);

	return { bmi, bmr, tdee };
}

function buildInitialPlan(profile, modelPlan) {
	return {
		plan_metadata: {
			generated_at: new Date().toISOString(),
			plan_version: "1.0",
			user_goal: profile.primaryGoal,
		},
		user_summary: {
			...calculateUserTargets(profile),
			target_physique_description:
				modelPlan.user_summary.target_physique_description,
		},
		nutrition_plan: modelPlan.nutrition_plan,
		weekly_schedule: modelPlan.weekly_schedule,
		adaptive_notes: modelPlan.adaptive_notes,
	};
}

function buildFullPlan(adaptationContext, modelPlan) {
	const previousPlan = getPreviousPlan(adaptationContext);

	return {
		plan_metadata: {
			...previousPlan.plan_metadata,
			generated_at: new Date().toISOString(),
		},
		user_summary: previousPlan.user_summary,
		nutrition_plan: previousPlan.nutrition_plan,
		weekly_schedule: modelPlan.weekly_schedule,
		adaptive_notes: modelPlan.adaptive_notes,
	};
}

function formatWorkoutLogsForPrompt(workoutLogs) {
	if (!workoutLogs?.length) {
		return "[]";
	}

	return JSON.stringify(
		workoutLogs.map((log) => ({
			day: log.day,
			session_type: log.sessionType,
			logged_for: log.loggedFor,
			exercises: log.exercises.map((exercise) => ({
				exercise_name: exercise.exerciseName,
				target_sets: exercise.targetSets,
				target_reps: exercise.targetReps,
				completion_status: exercise.completionStatus,
				sets_completed: exercise.setsCompleted,
				reps_completed: exercise.repsCompleted || "not provided",
				notes: exercise.notes || "not provided",
			})),
			notes: log.notes || "not provided",
		})),
	);
}

function formatScheduleForPrompt(schedule) {
	return JSON.stringify(
		schedule.map((session) => ({
			day: session.day,
			session_type: session.session_type,
			duration_minutes: session.duration_minutes,
			exercises: session.exercises.map((exercise) => ({
				exercise_name: exercise.exercise_name,
				target_muscle_group: exercise.target_muscle_group,
				sets: exercise.sets,
				reps: exercise.reps,
				equipment_needed: exercise.equipment_needed,
			})),
		})),
	);
}

function buildNutritionProfilePromptSection(profile) {
	return [
		`age=${profile.age}; sex=${profile.biologicalSex}; height_cm=${profile.height}; weight_kg=${profile.currentWeight}`,
		`goal=${profile.primaryGoal}; goal_target=${optionalValue(profile.goalTarget)}`,
		`workout_days=${profile.availableDays?.length || 0}; session=${profile.preferredSessionLength}; experience=${profile.experienceLevel}`,
		`diet=${profile.dietType}; avoid=${optionalValue(profile.allergiesOrFoodsToAvoid)}; meal_pref=${optionalValue(profile.mealFrequencyPreference)}`,
	].join("\n");
}

function buildWorkoutProfilePromptSection(profile) {
	return [
		`goal=${profile.primaryGoal}; experience=${profile.experienceLevel}; injury=${optionalValue(profile.injuriesOrLimitations)}`,
		`location=${profile.trainingLocation}; equipment=${JSON.stringify(profile.equipmentAvailable)}; machines=${JSON.stringify(profile.machineTypes || [])}; other_machines=${optionalValue(profile.customMachines)}`,
		`days=${JSON.stringify(profile.availableDays || [])}; session=${profile.preferredSessionLength}`,
	].join("\n");
}

function buildAdaptivePlanPrompt(profile, adaptationContext) {
	const previousPlan = getPreviousPlan(adaptationContext);
	const previousSchedule =
		previousPlan.weekly_schedule ||
		adaptationContext.previousPlan?.schedule ||
		[];

	return [
		"Adapt next week. Return only weekly_schedule + adaptive_notes. Keep nutrition/user_summary unchanged.",
		"Use previous schedule as baseline; avoid redesign unless logs justify it. Adjust conservatively.",
		buildWorkoutProfilePromptSection(profile),
		"previous_schedule=",
		formatScheduleForPrompt(previousSchedule),
		"workout_logs=",
		formatWorkoutLogsForPrompt(adaptationContext.workoutLogs),
		"Return JSON only.",
	].join("\n");
}

export async function generatePlan(profile, job) {
	const adaptationContext = job.data.adaptationContext;

	await job.updateProgress({
		stage: "plan_generation",
		message: adaptationContext
			? "Adapting your workout and nutrition plan."
			: "Generating your workout and nutrition plan.",
	});

	const modelPlan = adaptationContext
		? await generateAdaptiveModelPlan(
				buildModelRequest(profile, adaptationContext),
			)
		: await generateInitialModelPlan(profile, job);
	const plan = PlanSchema.parse(
		adaptationContext
			? buildFullPlan(adaptationContext, modelPlan)
			: buildInitialPlan(profile, modelPlan),
	);

	await job.updateProgress({
		stage: "plan_saving",
		message: "Saving your generated plan.",
	});

	const savedPlan = job.data.persistOnboardingAfterGeneration
		? await sequelize.transaction(async (transaction) => {
				const savedUser = await saveOnboardingProfile(
					job.data.userId,
					profile,
					{
						transaction,
					},
				);

				return saveGeneratedPlan({
					userId: job.data.userId,
					onboardingProfileId: savedUser?.onboardingProfile?.id || null,
					plan,
					transaction,
				});
			})
		: await saveGeneratedPlan({
				userId: job.data.userId,
				onboardingProfileId: job.data.onboardingProfileId,
				plan,
			});

	await job.updateProgress({
		stage: "plan_complete",
		message: adaptationContext
			? "Your adapted plan is ready."
			: "Your first plan is ready.",
	});

	return { plan: savedPlan };
}

export async function generateAdaptivePlansForEligibleUsers(job) {
	await job.updateProgress({
		stage: "weekly_refresh_started",
		message: "Preparing weekly plan adaptations.",
	});

	const users = await findUsersWithCompletedOnboarding();
	const results = [];

	for (const user of users) {
		const billingStatus = await getBillingStatusForUser(user.id);

		if (!billingStatus.hasActiveSubscription) {
			continue;
		}

		const workoutLogs = await findRecentWorkoutLogsForUser(user.id, 7);

		if (!workoutLogs.length) {
			results.push({ userId: user.id, status: "skipped_no_logs" });
			continue;
		}

		const previousPlan = await findLatestPlanForUser(user.id);

		if (!previousPlan) {
			results.push({ userId: user.id, status: "skipped_no_previous_plan" });
			continue;
		}

		await generatePlan(user.onboardingProfile.profile, {
			data: {
				userId: user.id,
				onboardingProfileId: user.onboardingProfile.id,
				profile: user.onboardingProfile.profile,
				adaptationContext: { previousPlan, workoutLogs },
			},
			updateProgress: (progress) => job.updateProgress(progress),
		});
		results.push({ userId: user.id, status: "generated" });
	}

	await job.updateProgress({
		stage: "weekly_refresh_complete",
		message: "Weekly plan adaptations complete.",
	});

	return { results };
}
