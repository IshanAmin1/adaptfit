import { Queue, QueueEvents } from "bullmq";
import { REDIS_HOST, REDIS_PORT } from "../config/env/storage.js";

const queuesWithListeners = new Map();

/**
 * Returns the task queue and task listener for the queue specified by queueName
 * @param {string} queueName
 * @returns {{ queue: Queue, listener: QueueEvents }}
 */
export function getQueueWithListener(queueName) {
	let queueWithListener = queuesWithListeners.get(queueName);

	if (!queueWithListener) {
		queueWithListener = {
			queue: new Queue(queueName, {
				connection: {
					host: REDIS_HOST,
					port: REDIS_PORT,
					removeOnComplete: true,
					removeOnFail: true,
				},
			}),
			listener: new QueueEvents(queueName, {
				connection: { host: REDIS_HOST, port: REDIS_PORT },
			}),
		};
		queuesWithListeners.set(queueName, queueWithListener);
	}

	return queueWithListener;
}

export const VALIDATE_ONBOARDING_QUEUE_NAME = "validate-onboarding";
export const GENERATE_PLAN_QUEUE_NAME = "generate-plan";

const ACTIVE_JOB_STATES = new Set(["waiting", "active", "delayed", "paused"]);

const QUEUE_STATUS_PATHS = {
	[VALIDATE_ONBOARDING_QUEUE_NAME]: "/onboarding/status",
	[GENERATE_PLAN_QUEUE_NAME]: "/plans/status",
};

/**
 * Enqueues a BullMQ job once per user while an equivalent job is still pending.
 * @param {string} queueName
 * @param {string} userId
 * @param {object} data
 * @returns {Promise<import("bullmq").Job>}
 */
export async function enqueueUserJob(queueName, userId, data) {
	const { queue } = getQueueWithListener(queueName);
	const jobId = `${queueName}-${userId}`;
	const existingJob = await queue.getJob(jobId);

	if (existingJob) {
		const state = await existingJob.getState();

		if (ACTIVE_JOB_STATES.has(state)) {
			const statusPath = QUEUE_STATUS_PATHS[queueName];
			const error = new Error(
				"A request is already in progress. Please wait for it to finish.",
			);
			error.status = 409;
			error.jobId = existingJob.id;
			error.statusUrl = `${statusPath}/${existingJob.id}/stream`;
			throw error;
		}

		await existingJob.remove();
	}

	return queue.add(`${queueName}-${userId}`, data, {
		jobId,
		removeOnComplete: true,
		removeOnFail: { age: 3600 },
	});
}

/**
 * Finds the current active job for a user on a queue, if one exists.
 * @param {string} queueName
 * @param {string} userId
 * @returns {Promise<{ jobId: string, statusUrl: string, state: string } | null>}
 */
export async function findActiveUserJob(queueName, userId) {
	const { queue } = getQueueWithListener(queueName);
	const jobId = `${queueName}-${userId}`;
	const job = await queue.getJob(jobId);

	if (!job) {
		return null;
	}

	const state = await job.getState();

	if (!ACTIVE_JOB_STATES.has(state)) {
		return null;
	}

	const statusPath = QUEUE_STATUS_PATHS[queueName];

	return {
		jobId: job.id,
		statusUrl: `${statusPath}/${job.id}/stream`,
		state,
	};
}
