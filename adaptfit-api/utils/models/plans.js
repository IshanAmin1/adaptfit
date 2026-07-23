import { Plan } from "../../models/index.js";

function flattenExercises(schedule) {
	return schedule.flatMap((session) =>
		session.exercises.map((exercise) => ({
			...exercise,
			day: session.day,
			session_type: session.session_type,
		})),
	);
}

export function serializePlan(plan) {
	return {
		id: plan.id,
		userId: plan.user_id,
		onboardingProfileId: plan.onboarding_profile_id,
		status: plan.status,
		metadata: plan.metadata,
		targets: plan.targets,
		nutrients: plan.nutrients,
		schedule: plan.schedule,
		exercises: plan.exercises,
		adaptiveNotes: plan.adaptive_notes,
		plan: {
			plan_metadata: plan.metadata,
			user_summary: plan.targets,
			nutrition_plan: plan.nutrients,
			weekly_schedule: plan.schedule,
			adaptive_notes: plan.adaptive_notes,
		},
		generatedAt: plan.generated_at,
		createdAt: plan.created_at,
		updatedAt: plan.updated_at,
	};
}

export async function saveGeneratedPlan({
	userId,
	onboardingProfileId = null,
	plan,
}) {
	const createdPlan = await Plan.create({
		user_id: userId,
		onboarding_profile_id: onboardingProfileId,
		status: "generated",
		metadata: plan.plan_metadata,
		targets: plan.user_summary,
		nutrients: plan.nutrition_plan,
		schedule: plan.weekly_schedule,
		exercises: flattenExercises(plan.weekly_schedule),
		adaptive_notes: plan.adaptive_notes,
		generated_at: new Date(),
	});

	return serializePlan(createdPlan.toJSON());
}

export async function findLatestPlanForUser(userId) {
	const plan = await Plan.findOne({
		where: { user_id: userId },
		order: [["generated_at", "DESC"]],
	});

	return plan ? serializePlan(plan.toJSON()) : null;
}
