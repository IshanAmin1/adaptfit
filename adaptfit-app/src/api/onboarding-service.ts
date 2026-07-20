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

export const onboardingService = {
	async submitProfileWithProgress(
		profile: OnboardingProfile,
		onProgress: (event: OnboardingProgressEvent) => void,
	): Promise<AuthUser> {
		const controller = new AbortController();
		let completedUser: AuthUser | null = null;

		await fetchEventSource(`${API_BASE_URL}/onboarding/stream`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Accept: "text/event-stream",
			},
			credentials: "include",
			body: JSON.stringify({ profile }),
			signal: controller.signal,
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
					controller.abort();
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
