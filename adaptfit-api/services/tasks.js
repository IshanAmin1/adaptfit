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
				connection: { host: REDIS_HOST, port: REDIS_PORT },
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
