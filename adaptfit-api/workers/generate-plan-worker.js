import { Worker } from "bullmq";
import { sequelize } from "../datasource.js";
import { REDIS_HOST, REDIS_PORT } from "../config/env/storage.js";
import { GENERATE_PLAN_QUEUE_NAME } from "../services/tasks.js";
import {
	generateAdaptivePlansForEligibleUsers,
	generatePlan,
} from "../services/plan-generation.js";

try {
	await sequelize.authenticate();
	console.log("Connection has been established successfully.");
} catch (error) {
	console.error("Unable to connect to the database:", error);
}

function logPlanGenerationFailure(job, startedAt, error) {
	console.error(
		`Plan generation job failed after ${Date.now() - startedAt}ms job=${
			job.id
		} user=${job.data.userId}:`,
		error,
	);
}

new Worker(
	GENERATE_PLAN_QUEUE_NAME,
	async (job) => {
		const startedAt = Date.now();

		try {
			if (job.data.refreshAllUsers) {
				return await generateAdaptivePlansForEligibleUsers(job);
			}

			return await generatePlan(job.data.profile, job);
		} catch (error) {
			logPlanGenerationFailure(job, startedAt, error);
			throw error;
		}
	},
	{
		connection: {
			host: REDIS_HOST,
			port: REDIS_PORT,
		},
		concurrency: 50,
	},
);
