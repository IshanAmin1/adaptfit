const API_BASE_URL =
	import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

type BillingRedirectResponse = {
	url?: string;
	alreadySubscribed?: boolean;
};

function parseRedirectResponse(
	response: Response,
	errorMessage: string,
): Promise<BillingRedirectResponse> {
	if (!response.ok) {
		throw new Error(errorMessage);
	}

	return response.json();
}

export const billingService = {
	syncSubscription(): Promise<void> {
		return fetch(`${API_BASE_URL}/billing/sync`, {
			method: "POST",
			credentials: "include",
		}).then((response) => {
			if (!response.ok) {
				throw new Error("Billing sync request failed");
			}
		});
	},

	createCheckoutSession(): Promise<BillingRedirectResponse> {
		return fetch(`${API_BASE_URL}/billing/checkout-session`, {
			method: "POST",
			credentials: "include",
		}).then((response) =>
			parseRedirectResponse(response, "Checkout session request failed"),
		);
	},

	createPortalSession(): Promise<BillingRedirectResponse> {
		return fetch(`${API_BASE_URL}/billing/portal-session`, {
			method: "POST",
			credentials: "include",
		}).then((response) =>
			parseRedirectResponse(response, "Portal session request failed"),
		);
	},
};
