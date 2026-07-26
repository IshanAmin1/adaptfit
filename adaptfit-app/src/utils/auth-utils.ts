import type { AuthUser } from "../types/auth";

export function getAuthenticatedPath(user: AuthUser) {
	if (!user.hasActiveSubscription) {
		return "/subscribe";
	}

	return user.hasCompletedOnboarding ? "/dashboard" : "/onboarding";
}
