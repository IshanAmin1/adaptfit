import type { AuthUser } from "../types/auth";
import { OnboardingProfile } from "../types/onboarding";

const API_BASE_URL =
	import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

type OnboardingResponse = {
	user: AuthUser;
};

type OnboardingErrorResponse = {
	error?: string;
	message?: string;
};

export const onboardingService = {
	submitProfile(profile: OnboardingProfile): Promise<AuthUser> {
		return fetch(`${API_BASE_URL}/onboarding`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			credentials: "include",
			body: JSON.stringify({ profile }),
		}).then(async (response) => {
			const body = (await response.json().catch(() => null)) as
				OnboardingResponse | OnboardingErrorResponse | null;

			if (!response.ok) {
				const errorBody = body as OnboardingErrorResponse | null;

				throw new Error(
					errorBody?.error || errorBody?.message || "Onboarding request failed",
				);
			}

			if (!body || !("user" in body) || !body.user) {
				throw new Error("Onboarding request failed");
			}

			return body.user;
		});
	},
};
