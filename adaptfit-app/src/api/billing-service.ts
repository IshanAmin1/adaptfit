const API_BASE_URL =
	import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

type BillingRedirectResponse = {
	url?: string;
	alreadySubscribed?: boolean;
};

type BillingStatusResponse = {
	hasActiveSubscription: boolean;
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
	getStatus(): Promise<BillingStatusResponse> {
		return fetch(`${API_BASE_URL}/billing/status`, {
			credentials: "include",
		}).then((response) => {
			if (!response.ok) {
				throw new Error("Billing status request failed");
			}

			return response.json();
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
