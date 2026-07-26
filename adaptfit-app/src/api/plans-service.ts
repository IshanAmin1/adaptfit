import type { ExerciseVideo, GeneratedPlan } from "../types/plan";
import { apiFetch } from "../utils/api.js";

type PlanResponse = {
	plan: GeneratedPlan;
};

type ExerciseResponse = {
	exercise: ExerciseVideo;
};

export const plansService = {
	async getLatestPlan(): Promise<GeneratedPlan | null> {
		const response = await apiFetch(`/plans`, {
			method: "GET",
		});

		if (response.status === 404) {
			return null;
		}

		const body = (await response.json().catch(() => null)) as
			PlanResponse | { error?: string; message?: string } | null;

		if (!response.ok) {
			const message =
				body && "error" in body
					? body.error || body.message
					: "Plan could not be loaded.";
			throw new Error(message || "Plan could not be loaded.");
		}

		if (!body || !("plan" in body)) {
			throw new Error("Plan could not be loaded.");
		}

		return body.plan;
	},

	async getExerciseVideo(exerciseDbId: string): Promise<ExerciseVideo> {
		const response = await apiFetch(`/exercises/${exerciseDbId}`, {
			method: "GET",
		});

		const body = (await response
			.json()
			.catch(() => null)) as ExerciseResponse | null;

		if (!response.ok) {
			throw new Error("Exercise could not be loaded.");
		}

		if (!body || !("exercise" in body)) {
			throw new Error("Exercise could not be loaded.");
		}

		return body.exercise;
	},
};
