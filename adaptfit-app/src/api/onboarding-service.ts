import type { AuthUser } from "../types/auth";
import { OnboardingProfile } from "../types/onboarding";

const API_BASE_URL =
	import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

type OnboardingResponse = {
	user: AuthUser;
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
		}).then((response) => {
			if (!response.ok) {
				throw new Error("Onboarding request failed");
			}

			return response.json().then((body: OnboardingResponse) => body.user);
		});
	},
};
