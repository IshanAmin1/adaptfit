import "dotenv/config";
import { Worker } from "bullmq";
import { sequelize } from "../datasource.js";
import { queryModelWithRetries } from "../services/openrouter.js";
import * as z from "zod";

import { GENERATE_PLAN_QUEUE_NAME } from "../services/tasks.js";
import { REDIS_HOST, REDIS_PORT } from "../config/env/storage.js";
import { saveGeneratedPlan } from "../utils/models/plans.js";

try {
	await sequelize.authenticate();
	console.log("Connection has been established successfully.");
} catch (error) {
	console.error("Unable to connect to the database:", error);
}

const PlanSchema = z.object({
	plan_metadata: z.object({
		generated_at: z.string(),
		plan_version: z.string(),
		user_goal: z.string(),
		disclaimer: z.string(),
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
	weekly_schedule: z.array(
		z.object({
			day: z.string(),
			session_type: z.string(),
			duration_minutes: z.number(),
			exercises: z.array(
				z.object({
					exercise_name: z.string(),
					target_muscle_group: z.string(),
					sets: z.number(),
					reps: z.string(),
					rest_seconds: z.number(),
					equipment_needed: z.array(z.string()),
					alternatives: z.array(
						z.object({
							exercise_name: z.string(),
							reason_for_alternative: z.string(),
						}),
					),
				}),
			),
		}),
	),
	adaptive_notes: z.object({
		adjustment_triggers: z.array(z.string()),
	}),
});

const PLAN_JSON_SCHEMA = {
	type: "object",
	additionalProperties: false,
	required: [
		"plan_metadata",
		"user_summary",
		"nutrition_plan",
		"weekly_schedule",
		"adaptive_notes",
	],
	properties: {
		plan_metadata: {
			type: "object",
			additionalProperties: false,
			required: ["generated_at", "plan_version", "user_goal", "disclaimer"],
			properties: {
				generated_at: { type: "string" },
				plan_version: { type: "string" },
				user_goal: { type: "string" },
				disclaimer: { type: "string" },
			},
		},
		user_summary: {
			type: "object",
			additionalProperties: false,
			required: ["bmi", "bmr", "tdee", "target_physique_description"],
			properties: {
				bmi: { type: "number" },
				bmr: { type: "number" },
				tdee: { type: "number" },
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
		weekly_schedule: {
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
						items: {
							type: "object",
							additionalProperties: false,
							required: [
								"exercise_name",
								"target_muscle_group",
								"sets",
								"reps",
								"rest_seconds",
								"equipment_needed",
								"alternatives",
							],
							properties: {
								exercise_name: { type: "string" },
								target_muscle_group: { type: "string" },
								sets: { type: "number" },
								reps: { type: "string" },
								rest_seconds: { type: "number" },
								equipment_needed: {
									type: "array",
									items: { type: "string" },
								},
								alternatives: {
									type: "array",
									items: {
										type: "object",
										additionalProperties: false,
										required: ["exercise_name", "reason_for_alternative"],
										properties: {
											exercise_name: { type: "string" },
											reason_for_alternative: { type: "string" },
										},
									},
								},
							},
						},
					},
				},
			},
		},
		adaptive_notes: {
			type: "object",
			additionalProperties: false,
			required: ["adjustment_triggers"],
			properties: {
				adjustment_triggers: {
					type: "array",
					items: { type: "string" },
				},
			},
		},
	},
};

const SYSTEM_PROMPT = [
	"You are a certified fitness and nutrition planning engine.",
	"You generate structured, personalized weekly workout and nutrition plans based on validated AdaptFit onboarding data.",
	"Output only valid JSON matching the provided schema. No markdown, commentary, or explanations outside the JSON.",
	"Every numeric field must be a number, not a string.",
	"If information is insufficient to safely recommend an exercise because of a stated injury or limitation, exclude it and choose a safer alternative.",
	"Do not provide medical diagnoses or clinical nutrition advice. Include the required standard disclaimer.",
	"Estimate calorie and macro targets using the Mifflin-St Jeor equation for BMR, adjusted by an activity multiplier based on training frequency and goal.",
	"Calculate BMI from current weight in kilograms and height in centimeters, rounded to one decimal place.",
	"Write target_physique_description as a neutral, general, text-only goal description. Do not reference the user's actual appearance or produce anything resembling a personal likeness.",
	"Every exercise must include at least 2 alternative exercises targeting the same muscle group.",
	"Prefer popular, standard exercise names that are likely to appear in exercise databases, such as Bench Press, Squat, Push Up, Pull Up, Lat Pulldown, Shoulder Press, Plank, Deadlift, Row, Lunge, Leg Press, Bicep Curl, Tricep Pushdown, and Chest Press.",
	"Use concise canonical exercise names instead of overly specific variations unless the user's available equipment, limitations, or goal requires the variation.",
	"Respect equipment, machine, schedule, injury, and dietary constraints exactly as given.",
	"Treat selected equipment as available tools, not as an exclusive requirement for every exercise. Bodyweight exercises are allowed whenever they fit the goal, even if the user selected dumbbells, bands, machines, barbell, or full gym access.",
].join("\n");

function optionalValue(value) {
	return value && String(value).trim() ? value : "not provided";
}

function buildPlanPrompt(profile) {
	return [
		"Generate a personalized weekly workout and nutrition plan for this validated AdaptFit onboarding profile.",
		"",
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
		"",
		"Return only the JSON object.",
	].join("\n");
}

async function generatePlan(profile, job) {
	await job.updateProgress({
		stage: "plan_generation",
		message: "Generating your workout and nutrition plan.",
	});

	const content = await queryModelWithRetries(
		SYSTEM_PROMPT,
		buildPlanPrompt(profile),
		(output) => {
			try {
				return !PlanSchema.safeParse(JSON.parse(output)).success;
			} catch {
				return true;
			}
		},
		1,
		{
			response_format: {
				type: "json_schema",
				json_schema: {
					name: "adaptfit_weekly_plan",
					schema: PLAN_JSON_SCHEMA,
				},
			},
		},
	);

	const plan = PlanSchema.parse(JSON.parse(content));

	await job.updateProgress({
		stage: "plan_saving",
		message: "Saving your generated plan.",
	});

	const savedPlan = await saveGeneratedPlan({
		userId: job.data.userId,
		onboardingProfileId: job.data.onboardingProfileId,
		plan,
	});

	await job.updateProgress({
		stage: "plan_complete",
		message: "Your first plan is ready.",
	});

	return { plan: savedPlan };
}

new Worker(
	GENERATE_PLAN_QUEUE_NAME,
	async (job) => generatePlan(job.data.profile, job),
	{
		connection: {
			host: REDIS_HOST,
			port: REDIS_PORT,
		},
		concurrency: 5,
	},
);
