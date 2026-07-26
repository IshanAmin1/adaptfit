import { apiFetch } from "../utils/api.js";

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
		return apiFetch(`/billing/sync`, {
			method: "POST",
		}).then((response) => {
			if (!response.ok) {
				throw new Error("Billing sync request failed");
			}
		});
	},

	createCheckoutSession(): Promise<BillingRedirectResponse> {
		return apiFetch(`/billing/checkout-session`, {
			method: "POST",
		}).then((response) =>
			parseRedirectResponse(response, "Checkout session request failed"),
		);
	},

	createPortalSession(): Promise<BillingRedirectResponse> {
		return apiFetch(`/billing/portal-session`, {
			method: "POST",
		}).then((response) =>
			parseRedirectResponse(response, "Portal session request failed"),
		);
	},
};
