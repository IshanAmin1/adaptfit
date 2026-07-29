import type { WorkoutLog, WorkoutLogInput } from "../types/plan";
import { apiFetch } from "../utils/api.js";

async function readWorkoutLogResponse<T>(
	response: Response,
	fallbackMessage: string,
) {
	const body = (await response.json().catch(() => null)) as {
		workoutLog: T;
		error?: string;
	} | null;

	if (!response.ok || !body) {
		throw new Error(body?.error || fallbackMessage);
	}

	return body.workoutLog;
}

export const loggingService = {
	async getTodayWorkoutLog(loggedFor: string): Promise<WorkoutLog | null> {
		const params = new URLSearchParams({
			loggedFor,
		});
		const response = await apiFetch(`/logging/workout-logs/today?${params}`, {
			method: "GET",
		});

		return readWorkoutLogResponse<WorkoutLog | null>(
			response,
			"Workout log could not be loaded.",
		);
	},

	async logWorkout(
		planId: string,
		workoutLog: WorkoutLogInput,
	): Promise<WorkoutLog> {
		const response = await apiFetch("/logging/workout-logs", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				planId,
				...workoutLog,
			}),
		});

		return readWorkoutLogResponse<WorkoutLog>(
			response,
			"Workout log could not be saved.",
		);
	},
};
