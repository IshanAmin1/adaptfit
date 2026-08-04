import { Plan } from "../../models/index.js";
import { planWithExerciseReferencesFromAPI } from "../../services/exercise-db.js";

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
		onboardingProfile: plan.onboardingProfile
			? {
					...plan.onboardingProfile.profile,
					completedAt: plan.onboardingProfile.completed_at || null,
				}
			: null,
		status: plan.status,
		metadata: plan.metadata,
		targets: plan.targets,
		nutrients: plan.nutrients,
		schedule: plan.schedule,
		exercises: plan.exercises,
		adaptiveNotes: plan.adaptive_notes,
		generatedAt: plan.generated_at,
	};
}

export async function saveGeneratedPlan({
	userId,
	onboardingProfileId = null,
	plan,
	transaction = null,
}) {
	const updatedPlan = await planWithExerciseReferencesFromAPI(plan);

	const createdPlan = await Plan.create(
		{
			user_id: userId,
			onboarding_profile_id: onboardingProfileId,
			status: "generated",
			metadata: updatedPlan.plan_metadata,
			targets: updatedPlan.user_summary,
			nutrients: updatedPlan.nutrition_plan,
			schedule: updatedPlan.weekly_schedule,
			exercises: flattenExercises(updatedPlan.weekly_schedule),
			adaptive_notes: updatedPlan.adaptive_notes,
			generated_at: new Date(),
		},
		{
			transaction,
		},
	);

	return serializePlan(createdPlan.toJSON());
}

export async function userHasGeneratedPlan(userId) {
	const planCount = await Plan.count({
		where: { user_id: userId },
	});

	return planCount > 0;
}

export async function findLatestPlanForUser(userId) {
	const plan = await Plan.findOne({
		where: { user_id: userId },
		include: [{ association: "onboardingProfile" }],
		order: [["generated_at", "DESC"]],
	});

	return plan ? serializePlan(plan.toJSON()) : null;
}

export async function findPlanForUser(planId, userId) {
	const plan = await Plan.findOne({
		where: { id: planId, user_id: userId },
		include: [{ association: "onboardingProfile" }],
	});

	return plan ? serializePlan(plan.toJSON()) : null;
}
