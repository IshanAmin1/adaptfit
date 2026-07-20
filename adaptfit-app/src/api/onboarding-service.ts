import { fetchEventSource } from "@microsoft/fetch-event-source";
import type { AuthUser } from "../types/auth";
import { OnboardingProfile } from "../types/onboarding";

const API_BASE_URL =
	import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

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
	  };

type StartOnboardingJobResponse = {
	jobId: string;
	statusUrl: string;
};

type OnboardingErrorResponse = {
	error?: string;
	message?: string;
};

function getStatusUrl(statusUrl: string) {
	if (statusUrl.startsWith("http")) {
		return statusUrl;
	}

	return `${API_BASE_URL}${statusUrl}`;
}

export const onboardingService = {
	async submitProfileWithProgress(
		profile: OnboardingProfile,
		onProgress: (event: OnboardingProgressEvent) => void,
	): Promise<AuthUser> {
		let completedUser: AuthUser | null = null;
		onProgress({
			stage: "received",
			message: "Reviewing your answers.",
		});

		const response = await fetch(`${API_BASE_URL}/onboarding`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			credentials: "include",
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

		await fetchEventSource(getStatusUrl(body.statusUrl), {
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

				let event: OnboardingStreamMessage;

				try {
					event = JSON.parse(message.data) as OnboardingStreamMessage;
				} catch {
					throw new Error("Onboarding stream returned an invalid message.");
				}

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

				if (event.type === "complete") {
					completedUser = event.user;
				}
			},
			onerror(error) {
				throw error;
			},
		});

		if (!completedUser) {
			throw new Error("Onboarding request failed");
		}

		return completedUser;
	},
};
