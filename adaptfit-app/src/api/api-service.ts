import type { AuthUser } from "../types/auth";

const API_BASE_URL =
	import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

type AuthResponse = {
	user: AuthUser;
};

function parseAuthResponse(response: Response): Promise<AuthUser> {
	return response.json().then((body: AuthResponse) => body.user);
}

export const apiService = {
	loginWithGoogle(credential: string): Promise<AuthUser> {
		return fetch(`${API_BASE_URL}/auth/google`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			credentials: "include",
			body: JSON.stringify({ credential }),
		}).then((response) => {
			if (!response.ok) {
				throw new Error("Google login failed");
			}

			return parseAuthResponse(response);
		});
	},

	getCurrentUser(): Promise<AuthUser | null> {
		return fetch(`${API_BASE_URL}/auth/me`, {
			credentials: "include",
		}).then((response) => {
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
		return fetch(`${API_BASE_URL}/auth/logout`, {
			method: "POST",
			credentials: "include",
		}).then(() => undefined);
	},
};
