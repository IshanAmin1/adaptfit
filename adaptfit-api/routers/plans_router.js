import { Router } from "express";
import { isAuthenticated } from "../middleware/auth.js";
import { planGenerationRateLimit } from "../middleware/rate_limit.js";
import { hasActiveSubscription } from "../middleware/subscription.js";
import { streamQueueJobStatus } from "../middleware/queue_status_stream.js";
import {
	enqueueUserJob,
	GENERATE_PLAN_QUEUE_NAME,
	getQueueWithListener,
} from "../services/tasks.js";
import { findLatestPlanForUser } from "../utils/models/plans.js";
import { findRecentWorkoutLogsForUser } from "../utils/models/workout_logs.js";

export const plansRouter = Router();

const WEEKLY_PLAN_ADAPTATION_JOB_ID = "weekly-plan-adaptation";
const WEEKLY_PLAN_ADAPTATION_REPEAT = {
	pattern: "0 23 * * 0",
	tz: "America/Toronto",
};

export async function enqueuePlanGeneration(
	userId,
	onboardingProfile,
	adaptationContext = null,
) {
	if (!onboardingProfile?.profile) {
		const error = new Error(
			"Onboarding profile is required before generating a plan.",
		);
		error.status = 409;
		throw error;
	}

	const job = await enqueueUserJob(GENERATE_PLAN_QUEUE_NAME, userId, {
		userId,
		onboardingProfileId: onboardingProfile.id,
		profile: onboardingProfile.profile,
		adaptationContext,
	});

	return {
		jobId: job.id,
		statusUrl: `/plans/status/${job.id}/stream`,
	};
}

export async function scheduleWeeklyPlanAdaptations() {
	const { queue } = getQueueWithListener(GENERATE_PLAN_QUEUE_NAME);

	const existingScheduler =
		typeof queue.getJobScheduler === "function"
			? await queue.getJobScheduler(WEEKLY_PLAN_ADAPTATION_JOB_ID)
			: null;

	if (existingScheduler) {
		return;
	}

	if (typeof queue.upsertJobScheduler === "function") {
		await queue.upsertJobScheduler(
			WEEKLY_PLAN_ADAPTATION_JOB_ID,
			WEEKLY_PLAN_ADAPTATION_REPEAT,
			{
				name: WEEKLY_PLAN_ADAPTATION_JOB_ID,
				data: { refreshAllUsers: true },
			},
		);
		return;
	}

	const existingRepeatableJobs = await queue.getRepeatableJobs();
	const existingRepeatableJob = existingRepeatableJobs.find(
		(job) => job.id === WEEKLY_PLAN_ADAPTATION_JOB_ID,
	);

	if (existingRepeatableJob) {
		return;
	}

	await queue.add(
		WEEKLY_PLAN_ADAPTATION_JOB_ID,
		{ refreshAllUsers: true },
		{
			jobId: WEEKLY_PLAN_ADAPTATION_JOB_ID,
			repeat: WEEKLY_PLAN_ADAPTATION_REPEAT,
		},
	);
}

plansRouter.get(
	"/",
	isAuthenticated,
	hasActiveSubscription,
	async (req, res) => {
		try {
			const plan = await findLatestPlanForUser(req.user.id);

			if (!plan) {
				return res
					.status(404)
					.json({ error: "No plan has been generated yet." });
			}

			return res.json({ plan });
		} catch (error) {
			console.error(error);
			return res.status(500).json({ error: "Plan could not be loaded." });
		}
	},
);

plansRouter.post(
	"/",
	isAuthenticated,
	hasActiveSubscription,
	planGenerationRateLimit,
	async (req, res) => {
		try {
			const planJob = await enqueuePlanGeneration(
				req.user.id,
				req.user.onboardingProfile,
			);

			return res.status(202).json(planJob);
		} catch (error) {
			console.error(error);

			if (error.status) {
				return res.status(error.status).json({
					error: error.message,
					jobId: error.jobId,
					statusUrl: error.statusUrl,
				});
			}

			return res
				.status(503)
				.json({ error: "Plan generation could not be started." });
		}
	},
);

plansRouter.post(
	"/adapt",
	isAuthenticated,
	hasActiveSubscription,
	async (req, res) => {
		try {
			const previousPlan = await findLatestPlanForUser(req.user.id);

			if (!previousPlan) {
				return res
					.status(409)
					.json({ error: "Generate a plan before testing adaptation." });
			}

			const workoutLogs = await findRecentWorkoutLogsForUser(req.user.id, 7);

			if (!workoutLogs.length) {
				return res.status(409).json({
					error: "Log at least one workout before testing adaptation.",
				});
			}

			const planJob = await enqueuePlanGeneration(
				req.user.id,
				req.user.onboardingProfile,
				{ previousPlan, workoutLogs },
			);

			return res.status(202).json(planJob);
		} catch (error) {
			console.error(error);

			if (error.status) {
				return res.status(error.status).json({ error: error.message });
			}

			return res
				.status(503)
				.json({ error: "Adaptive plan generation could not be started." });
		}
	},
);

plansRouter.get(
	"/status/:jobId/stream",
	isAuthenticated,
	hasActiveSubscription,
	streamQueueJobStatus(
		GENERATE_PLAN_QUEUE_NAME,
		async ({ returnvalue, send }) => {
			send({
				type: "complete",
				plan: returnvalue?.plan,
			});
		},
	),
);
