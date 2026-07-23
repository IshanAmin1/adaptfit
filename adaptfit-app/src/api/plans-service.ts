import type { GeneratedPlan } from "../types/plan";

const API_BASE_URL =
	import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

type PlanResponse = {
	plan: GeneratedPlan;
};

export const plansService = {
	async getLatestPlan(): Promise<GeneratedPlan | null> {
		const response = await fetch(`${API_BASE_URL}/plans`, {
			method: "GET",
			credentials: "include",
		});

		if (response.status === 404) {
			return null;
		}

		const body = (await response.json().catch(() => null)) as
			PlanResponse | { error?: string; message?: string } | null;

		if (!response.ok) {
			const message =
				body && "error" in body
					? body.error || body.message
					: "Plan could not be loaded.";
			throw new Error(message || "Plan could not be loaded.");
		}

		if (!body || !("plan" in body)) {
			throw new Error("Plan could not be loaded.");
		}

		return body.plan;
	},
};
