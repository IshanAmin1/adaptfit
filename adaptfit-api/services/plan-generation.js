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

const InitialModelPlanSchema = z.object({
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

const PLAN_JSON_SCHEMA = {
	type: "object",
	additionalProperties: false,
	required: [
		"user_summary",
		"nutrition_plan",
		"weekly_schedule",
		"adaptive_notes",
	],
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

const SYSTEM_PROMPT = [
	"You are a certified fitness and nutrition planning engine.",
	"You generate structured, personalized weekly workout and nutrition plans based on validated AdaptFit onboarding data.",
	"Output only valid JSON matching the provided schema. No markdown, commentary, or explanations outside the JSON.",
	"Return only essential plan content. Do not include metadata, BMI, BMR, TDEE, long explanations, or extra fields.",
	"Every numeric field must be a number, not a string.",
	"If information is insufficient to safely recommend an exercise because of a stated injury or limitation, exclude it and choose a safer alternative.",
	"Do not provide medical diagnoses or clinical nutrition advice.",
	"Estimate calorie and macro targets using the Mifflin-St Jeor equation for BMR, adjusted by an activity multiplier based on training frequency and goal.",
	"Write target_physique_description as one concise neutral goal sentence. Do not reference the user's actual appearance or produce anything resembling a personal likeness.",
	"Return exactly one sample meal. Keep its description practical and short: 3-5 foods, not a full recipe or exhaustive ingredient list.",
	"Limit exercise count by preferred session length: 30 minutes means 2-3 exercises per workout, 45 minutes means 3-4 exercises, and 60 or 60_plus means 4-6 exercises. Never exceed those limits.",
	"Prefer popular, standard exercise names that are likely to appear in exercise databases, such as Bench Press, Squat, Push Up, Pull Up, Lat Pulldown, Shoulder Press, Plank, Deadlift, Row, Lunge, Leg Press, Bicep Curl, Tricep Pushdown, and Chest Press.",
	"Use concise canonical exercise names instead of overly specific variations unless the user's available equipment, limitations, or goal requires the variation.",
	"Respect equipment, machine, schedule, injury, and dietary constraints exactly as given.",
	"Treat selected equipment as available tools, not as an exclusive requirement for every exercise. Bodyweight exercises are allowed whenever they fit the goal, even if the user selected dumbbells, bands, machines, barbell, or full gym access.",
].join("\n");

const ADAPTIVE_SYSTEM_PROMPT = [
	"You are a certified fitness planning engine.",
	"You adapt weekly workout schedules based on validated AdaptFit onboarding data and recent workout logs.",
	"Output only valid JSON matching the provided schema. No markdown, commentary, or explanations outside the JSON.",
	"Every numeric field must be a number, not a string.",
	"Keep changes conservative and grounded in the user's recent workout completion logs.",
	"Respect equipment, schedule, injury, and training constraints exactly as given.",
	"If information is insufficient to safely recommend an exercise because of a stated injury or limitation, exclude it and choose a safer alternative.",
	"Limit exercise count by preferred session length: 30 minutes means 2-3 exercises per workout, 45 minutes means 3-4 exercises, and 60 or 60_plus means 4-6 exercises. Never exceed those limits.",
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
		systemPrompt: SYSTEM_PROMPT,
		prompt: [
			"Generate a personalized weekly workout and nutrition plan for this validated AdaptFit onboarding profile.",
			"",
			buildProfilePromptSection(profile),
			"",
			"Return only the JSON object.",
		].join("\n"),
		responseSchema: InitialModelPlanSchema,
		jsonSchema: PLAN_JSON_SCHEMA,
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
		return "No workout completion logs were recorded this week.";
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
		null,
		2,
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
		null,
		2,
	);
}

function buildProfilePromptSection(profile) {
	return [
		"USER PROFILE:",
		`- Age: ${profile.age}`,
		`- Biological sex: ${profile.biologicalSex}`,
		`- Height: ${profile.height} cm`,
		`- Current weight: ${profile.currentWeight} kg`,
		"",
		"GOALS:",
		`- Primary goal: ${profile.primaryGoal}`,
		`- Goal target: ${optionalValue(profile.goalTarget)}`,
		"",
		"EXPERIENCE & HEALTH:",
		`- Experience level: ${profile.experienceLevel}`,
		`- Injuries or limitations: ${optionalValue(profile.injuriesOrLimitations)}`,
		"",
		"EQUIPMENT & SCHEDULE:",
		`- Training location: ${profile.trainingLocation}`,
		`- Available equipment: ${JSON.stringify(profile.equipmentAvailable)}`,
		`- Machine types: ${JSON.stringify(profile.machineTypes || [])}`,
		`- Other machines: ${optionalValue(profile.customMachines)}`,
		"- Equipment guidance: use the selected equipment where helpful, but you may mix in bodyweight exercises such as push-ups, planks, squats, lunges, or mobility work when appropriate.",
		`- Available workout days: ${JSON.stringify(profile.availableDays || [])}`,
		`- Number of available workout days: ${profile.availableDays?.length || 0}`,
		`- Preferred session length: ${profile.preferredSessionLength}`,
		"- Schedule workouts only on the selected available workout days. Days outside that list should not contain workouts.",
		"",
		"NUTRITION PREFERENCES:",
		`- Diet type: ${profile.dietType}`,
		`- Allergies or foods to avoid: ${optionalValue(profile.allergiesOrFoodsToAvoid)}`,
		`- Meal frequency preference: ${optionalValue(profile.mealFrequencyPreference)}`,
	].join("\n");
}

function buildAdaptiveProfilePromptSection(profile) {
	return [
		"TRAINING PROFILE:",
		`- Primary goal: ${profile.primaryGoal}`,
		`- Experience level: ${profile.experienceLevel}`,
		`- Injuries or limitations: ${optionalValue(profile.injuriesOrLimitations)}`,
		"",
		"TRAINING CONSTRAINTS:",
		`- Training location: ${profile.trainingLocation}`,
		`- Available equipment: ${JSON.stringify(profile.equipmentAvailable)}`,
		`- Machine types: ${JSON.stringify(profile.machineTypes || [])}`,
		`- Other machines: ${optionalValue(profile.customMachines)}`,
		"- Equipment guidance: use the selected equipment where helpful, but you may mix in bodyweight exercises such as push-ups, planks, squats, lunges, or mobility work when appropriate.",
		`- Available workout days: ${JSON.stringify(profile.availableDays || [])}`,
		`- Preferred session length: ${profile.preferredSessionLength}`,
		"- Schedule workouts only on the selected available workout days. Days outside that list should not contain workouts.",
	].join("\n");
}

function buildAdaptivePlanPrompt(profile, adaptationContext) {
	const previousPlan = getPreviousPlan(adaptationContext);
	const previousSchedule =
		previousPlan.weekly_schedule ||
		adaptationContext.previousPlan?.schedule ||
		[];

	return [
		"Adapt only the user's weekly workout schedule for next week.",
		"",
		"ADAPTATION RULES:",
		"- Return only weekly_schedule and adaptive_notes.",
		"- Do not create or change nutrition targets, meals, calories, macros, user summary, or plan metadata.",
		"- Use the previous weekly schedule as the baseline. Do not redesign from scratch.",
		"- Keep the same workout days, session types, and exercises when adherence was good.",
		"- If a workout or exercise was partial, adjust conservatively by reducing sets, simplifying the exercise, adding recovery, or choosing a safer exercise.",
		"- If workouts were completed consistently, progress gradually with modest changes to volume, intensity, or exercise complexity.",
		"- Respect onboarding constraints exactly.",
		"- Use adaptive_notes.adjustment_triggers to summarize the most important reasons for the changes.",
		"",
		buildAdaptiveProfilePromptSection(profile),
		"",
		"PREVIOUS WEEKLY SCHEDULE BASELINE:",
		formatScheduleForPrompt(previousSchedule),
		"",
		"THIS WEEK'S WORKOUT COMPLETION LOGS:",
		formatWorkoutLogsForPrompt(adaptationContext.workoutLogs),
		"",
		"Return only the JSON object.",
	].join("\n");
}

export async function generatePlan(profile, job) {
	const adaptationContext = job.data.adaptationContext;
	const modelRequest = buildModelRequest(profile, adaptationContext);

	await job.updateProgress({
		stage: "plan_generation",
		message: adaptationContext
			? "Adapting your workout and nutrition plan."
			: "Generating your workout and nutrition plan.",
	});

	const content = await queryModelWithRetries(
		modelRequest.systemPrompt,
		modelRequest.prompt,
		(output) => requirePlanOutputRetry(modelRequest.responseSchema, output),
		1,
		{
			response_format: {
				type: "json_schema",
				json_schema: {
					name: "adaptfit_weekly_plan",
					schema: modelRequest.jsonSchema,
				},
			},
		},
	);

	const modelPlan = modelRequest.responseSchema.parse(JSON.parse(content));
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
