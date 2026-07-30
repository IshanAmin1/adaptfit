import { fetchEventSource } from "@microsoft/fetch-event-source";
import type { ExerciseVideo, GeneratedPlan } from "../types/plan";
import { apiFetch, getApiUrl } from "../utils/api.js";

type PlanResponse = {
	plan: GeneratedPlan;
};

type ExerciseResponse = {
	exercise: ExerciseVideo;
};

type PlanErrorResponse = {
	error?: string;
	message?: string;
};

type PlanJobResponse = {
	jobId: string;
	statusUrl: string;
};

type PlanProgressEvent = {
	stage: string;
	message: string;
};

type PlanStreamMessage =
	| {
			type: "progress";
			stage: string;
			message: string;
	  }
	| {
			type: "error";
			error?: string;
			message?: string;
	  }
	| {
			type: "complete";
			plan?: GeneratedPlan;
	  };

function getStatusUrl(statusUrl: string) {
	if (statusUrl.startsWith("http")) {
		return statusUrl;
	}

	return getApiUrl(statusUrl);
}

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

	async adaptPlan(): Promise<PlanJobResponse> {
		const response = await apiFetch(`/plans/adapt`, {
			method: "POST",
		});

		const body = (await response.json().catch(() => null)) as
			PlanJobResponse | PlanErrorResponse | null;

		if (!response.ok) {
			const errorBody = body as PlanErrorResponse | null;

			if (
				response.status === 409 &&
				body &&
				"jobId" in body &&
				body.jobId &&
				"statusUrl" in body &&
				body.statusUrl
			) {
				return body;
			}

			throw new Error(
				errorBody?.error ||
					errorBody?.message ||
					"Adaptive plan generation could not be started.",
			);
		}

		if (!body || !("jobId" in body) || !body.jobId) {
			throw new Error("Adaptive plan generation could not be started.");
		}

		return body;
	},

	async streamPlanStatus(
		statusUrl: string,
		onProgress: (event: PlanProgressEvent) => void,
	): Promise<GeneratedPlan | null> {
		let completedPlan: GeneratedPlan | null = null;

		await fetchEventSource(getStatusUrl(statusUrl), {
			method: "GET",
			headers: {
				Accept: "text/event-stream",
			},
			credentials: "include",
			openWhenHidden: true,
			onmessage(message) {
				if (!message.data) {
					return;
				}

				let event: PlanStreamMessage;

				try {
					event = JSON.parse(message.data) as PlanStreamMessage;
				} catch {
					throw new Error("Plan status returned an invalid message.");
				}

				if (event.type === "progress") {
					onProgress({ stage: event.stage, message: event.message });
					return;
				}

				if (event.type === "error") {
					throw new Error(
						event.error || event.message || "Plan update failed.",
					);
				}

				if (event.type === "complete") {
					completedPlan = event.plan ?? null;
				}
			},
			onerror(error) {
				throw error;
			},
		});

		return completedPlan;
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
