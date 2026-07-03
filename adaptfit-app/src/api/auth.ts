import type { AuthUser } from "../types/auth";

const API_BASE_URL =
	import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

type AuthResponse = {
	user: AuthUser;
};

async function parseAuthResponse(response: Response): Promise<AuthUser> {
	const body = (await response.json()) as AuthResponse;
	return body.user;
}

export async function loginWithGoogle(credential: string): Promise<AuthUser> {
	const response = await fetch(`${API_BASE_URL}/auth/google`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		credentials: "include",
		body: JSON.stringify({ credential }),
	});

	if (!response.ok) {
		throw new Error("Google login failed");
	}

	return parseAuthResponse(response);
}

export async function getCurrentUser(): Promise<AuthUser | null> {
	const response = await fetch(`${API_BASE_URL}/auth/me`, {
		credentials: "include",
	});

	if (response.status === 401) {
		return null;
	}

	if (!response.ok) {
		throw new Error("Current user request failed");
	}

	return parseAuthResponse(response);
}

export async function logout(): Promise<void> {
	await fetch(`${API_BASE_URL}/auth/logout`, {
		method: "POST",
		credentials: "include",
	});
}
