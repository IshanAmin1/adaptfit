import { fetchEventSource } from "@microsoft/fetch-event-source";
import { authService } from "./auth-service";
import type { AuthUser } from "../types/auth";
import { OnboardingProfile } from "../types/onboarding";
import { apiFetch, getApiUrl } from "../utils/api.js";

export type OnboardingProgressEvent = {
	stage: string;
	message: string;
};

type OnboardingStreamMessage =
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
			user: AuthUser;
			planJobId?: string;
			planStatusUrl?: string;
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
			plan?: unknown;
	  };

type StartOnboardingJobResponse = {
	jobId: string;
	statusUrl: string;
};

export type PendingOnboardingJob = {
	pending: true;
	queueName: string;
	jobId: string;
	statusUrl: string;
	state: string;
};

type PendingOnboardingJobResponse =
	| PendingOnboardingJob
	| {
			pending: false;
	  };

type OnboardingErrorResponse = {
	error?: string;
	message?: string;
};

function getStatusUrl(statusUrl: string) {
	if (statusUrl.startsWith("http")) {
		return statusUrl;
	}

	return getApiUrl(statusUrl);
}

async function streamStatus(
	statusUrl: string,
	onMessage: (event: OnboardingStreamMessage | PlanStreamMessage) => void,
) {
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

			let event: OnboardingStreamMessage | PlanStreamMessage;

			try {
				event = JSON.parse(message.data) as
					OnboardingStreamMessage | PlanStreamMessage;
			} catch {
				throw new Error("Status stream returned an invalid message.");
			}

			onMessage(event);
		},
		onerror(error) {
			throw error;
		},
	});
}

async function refreshUserAfterPlanGeneration(fallbackUser: AuthUser) {
	try {
		const refreshedUser = await authService.getCurrentUser();
		return refreshedUser ?? fallbackUser;
	} catch {
		return fallbackUser;
	}
}

async function streamPlanGeneration(
	planStatusUrl: string,
	onProgress: (event: OnboardingProgressEvent) => void,
) {
	await streamStatus(planStatusUrl, (event) => {
		if (event.type === "progress") {
			onProgress({
				stage: event.stage,
				message: event.message,
			});
			return;
		}

		if (event.type === "error") {
			const message =
				event.error || event.message || "Plan generation request failed";

			onProgress({
				stage: "error",
				message,
			});
			throw new Error(message);
		}
	});
}

export const onboardingService = {
	async getPendingJob(): Promise<PendingOnboardingJob | null> {
		const response = await apiFetch(`/onboarding/pending`, {
			method: "GET",
		});

		const body = (await response.json().catch(() => null)) as
			PendingOnboardingJobResponse | OnboardingErrorResponse | null;

		if (!response.ok) {
			const message =
				body && "error" in body
					? body.error || body.message
					: "Pending onboarding status could not be loaded.";
			throw new Error(
				message || "Pending onboarding status could not be loaded.",
			);
		}

		if (body && "pending" in body && body.pending) {
			return body;
		}

		return null;
	},

	async streamPendingJobWithProgress(
		statusUrl: string,
		fallbackUser: AuthUser,
		onProgress: (event: OnboardingProgressEvent) => void,
	): Promise<AuthUser> {
		let completedUser: AuthUser | null = null;
		let planStatusUrl: string | null = null;
		const isPlanStatusUrl = statusUrl.includes("/plans/status/");

		await streamStatus(statusUrl, (event) => {
			if (event.type === "progress") {
				onProgress({
					stage: event.stage,
					message: event.message,
				});
				return;
			}

			if (event.type === "error") {
				const message =
					event.error || event.message || "Onboarding request failed";

				onProgress({
					stage: "error",
					message,
				});
				throw new Error(message);
			}

			if (event.type === "complete" && "user" in event) {
				completedUser = event.user;
				planStatusUrl = event.planStatusUrl ?? null;
			}
		});

		if (planStatusUrl) {
			await streamPlanGeneration(planStatusUrl, onProgress);
			return refreshUserAfterPlanGeneration(completedUser ?? fallbackUser);
		}

		if (isPlanStatusUrl) {
			return refreshUserAfterPlanGeneration(fallbackUser);
		}

		return completedUser ?? fallbackUser;
	},

	async submitProfileWithProgress(
		profile: OnboardingProfile,
		onProgress: (event: OnboardingProgressEvent) => void,
	): Promise<AuthUser> {
		onProgress({
			stage: "start",
			message: "Starting validation process.",
		});

		const response = await apiFetch(`/onboarding`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ profile }),
		});

		const body = (await response.json().catch(() => null)) as
			StartOnboardingJobResponse | OnboardingErrorResponse | null;

		if (!response.ok) {
			const errorBody = body as OnboardingErrorResponse | null;
			const message =
				errorBody?.error || errorBody?.message || "Onboarding request failed";

			onProgress({
				stage: "error",
				message,
			});
			throw new Error(message);
		}

		if (!body || !("statusUrl" in body) || !body.statusUrl) {
			throw new Error("Onboarding request failed");
		}

		onProgress({
			stage: "plan_queued",
			message: "Starting your plan generation.",
		});

		await streamPlanGeneration(body.statusUrl, onProgress);

		const refreshedUser = await authService.getCurrentUser();

		if (!refreshedUser) {
			throw new Error(
				"Onboarding completed, but your user session could not be refreshed.",
			);
		}

		return refreshedUser;
	},
};
