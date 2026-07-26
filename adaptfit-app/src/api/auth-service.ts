import type { AuthUser } from "../types/auth";
import { apiFetch, getApiUrl } from "../utils/api.js";

type AuthResponse = {
	user: AuthUser;
};

function parseAuthResponse(response: Response): Promise<AuthUser> {
	return response.json().then((body: AuthResponse) => body.user);
}

export const authService = {
	getGoogleLoginUrl(): string {
		// navigates to the backend endpoint that initiates the Google OAuth flow
		return getApiUrl("/auth/google/start");
	},

	getCurrentUser(): Promise<AuthUser | null> {
		return apiFetch(`/auth/me`).then((response) => {
			if (response.status === 401) {
				return null;
			}

			if (!response.ok) {
				throw new Error("Current user request failed");
			}

			return parseAuthResponse(response);
		});
	},

	logout(): Promise<void> {
		return apiFetch(`/auth/logout`, {
			method: "POST",
		}).then(() => undefined);
	},
};
