import type { AuthUser } from "../types/auth";

const API_BASE_URL =
	import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

export type OnboardingProfile = {
	age: string;
	biologicalSex: string;
	height: string;
	currentWeight: string;
	primaryGoal: string;
	targetWeightOrTimeline?: string;
	experienceLevel: string;
	injuriesOrLimitations: string;
	trainingLocation: string;
	equipmentAvailable: string[];
	machineTypes: string[];
	customMachines?: string;
	daysPerWeek: string;
	preferredSessionLength: string;
	dietType: string;
	allergiesOrFoodsToAvoid: string;
	mealFrequencyPreference?: string;
};

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
