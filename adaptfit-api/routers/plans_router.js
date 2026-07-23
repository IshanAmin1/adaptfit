import { Router } from "express";
import { isAuthenticated } from "../middleware/auth.js";
import { hasActiveSubscription } from "../middleware/subscription.js";
import { streamQueueJobStatus } from "../middleware/queue_status_stream.js";
import {
	GENERATE_PLAN_QUEUE_NAME,
	getQueueWithListener,
} from "../services/tasks.js";
import { findLatestPlanForUser } from "../utils/models/plans.js";

export const plansRouter = Router();

export async function enqueuePlanGeneration(userId, onboardingProfile) {
	if (!onboardingProfile?.profile) {
		const error = new Error(
			"Onboarding profile is required before generating a plan.",
		);
		error.status = 409;
		throw error;
	}

	const { queue } = getQueueWithListener(GENERATE_PLAN_QUEUE_NAME);
	const job = await queue.add(`${GENERATE_PLAN_QUEUE_NAME}-${userId}`, {
		userId,
		onboardingProfileId: onboardingProfile.id,
		profile: onboardingProfile.profile,
	});

	return {
		jobId: job.id,
		statusUrl: `/plans/status/${job.id}/stream`,
	};
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
				return res.status(error.status).json({ error: error.message });
			}

			return res
				.status(503)
				.json({ error: "Plan generation could not be started." });
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
