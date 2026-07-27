import { Router } from "express";
import { isAuthenticated } from "../middleware/auth.js";
import { billingRateLimit } from "../middleware/rate_limit.js";
import {
	deleteCheckoutSession,
	findPendingCheckoutSessionForUser,
	findStripeCustomerIdForUser,
	getBillingStatusForUser,
	recordCheckoutSession,
	upsertStripeSubscription,
} from "../utils/models/subscriptions.js";
import { getStripeClient } from "../services/stripe.js";

import { CLIENT_ORIGIN } from "../config/env/server.js";
import { STRIPE_MONTHLY_PRICE_ID } from "../config/env/stripe.js";

export const billingRouter = Router();

const MAX_SUBSCRIPTIONS_TO_FETCH = 100; // Stripe's maximum limit for listing subscriptions

// See https://docs.stripe.com/api/checkout/sessions/retrieve?lang=node
async function getOrCreateStripeCustomer(stripe, user) {
	const existingCustomerId = await findStripeCustomerIdForUser(user.id);

	if (existingCustomerId) {
		return existingCustomerId;
	}

	const customer = await stripe.customers.create({
		email: user.email,
		name: user.full_name || undefined,
		metadata: {
			appUserId: user.id,
		},
	});

	return customer.id;
}

// Syncs all subscriptions for a given Stripe customer ID to the local database,
// useful for ensuring that the local database is up to date with Stripe's records,
// especially after a checkout session is completed or when a user logs in, as
// we cannot ensure webhooks are always received in time or at all.
async function syncCustomerSubscriptions(stripe, stripeCustomerId) {
	const stripeSubscriptions = await stripe.subscriptions.list({
		customer: stripeCustomerId,
		status: "all",
		limit: MAX_SUBSCRIPTIONS_TO_FETCH,
	});

	await Promise.all(
		stripeSubscriptions.data.map((stripeSubscription) =>
			upsertStripeSubscription(stripeSubscription),
		),
	);
}

async function getReusableCheckoutUrl({
	stripe,
	userId,
	stripeCustomerId,
	stripePriceId,
}) {
	const pendingCheckoutSession = await findPendingCheckoutSessionForUser(
		userId,
		stripePriceId,
	);
	// no pending checkout session found, so we cannot reuse any existing checkout URL
	if (!pendingCheckoutSession?.stripe_checkout_session_id) {
		return null;
	}

	const checkoutSession = await stripe.checkout.sessions.retrieve(
		pendingCheckoutSession.stripe_checkout_session_id,
	);
	// open status means the checkout session is still in progress. Payment processing has not started
	if (checkoutSession.status === "open" && checkoutSession.url) {
		return checkoutSession.url;
	}

	const stripeSubscriptionId =
		typeof checkoutSession.subscription === "string" // could be a string or an object depending on the API version
			? checkoutSession.subscription
			: checkoutSession.subscription?.id;

	if (stripeSubscriptionId) {
		const stripeSubscription =
			await stripe.subscriptions.retrieve(stripeSubscriptionId);
		await upsertStripeSubscription(stripeSubscription);
	} else {
		if (checkoutSession.status === "expired") {
			await deleteCheckoutSession(pendingCheckoutSession.id);
			return null;
		}

		await syncCustomerSubscriptions(stripe, stripeCustomerId);
	}

	return null;
}

billingRouter.post("/sync", isAuthenticated, billingRateLimit, async (req, res) => {
	try {
		const stripe = getStripeClient();
		const stripeCustomerId = await findStripeCustomerIdForUser(req.user.id);

		if (stripeCustomerId) {
			await syncCustomerSubscriptions(stripe, stripeCustomerId);
		}

		return res.json({ ok: true });
	} catch (error) {
		console.error(error);
		return res.status(500).json({ error: "Billing sync failed." });
	}
});

billingRouter.post(
	"/checkout-session",
	isAuthenticated,
	billingRateLimit,
	async (req, res) => {
	try {
		const stripe = getStripeClient();
		const stripeCustomerId = await getOrCreateStripeCustomer(stripe, req.user);

		await syncCustomerSubscriptions(stripe, stripeCustomerId);

		const billingStatus = await getBillingStatusForUser(req.user.id);

		if (billingStatus.hasActiveSubscription) {
			return res.json({ alreadySubscribed: true });
		}

		const reusableCheckoutUrl = await getReusableCheckoutUrl({
			stripe,
			userId: req.user.id,
			stripeCustomerId,
			stripePriceId: STRIPE_MONTHLY_PRICE_ID,
		});

		if (reusableCheckoutUrl) {
			return res.json({ url: reusableCheckoutUrl, reused: true });
		}

		const checkoutSession = await stripe.checkout.sessions.create({
			mode: "subscription",
			customer: stripeCustomerId,
			line_items: [
				{
					price: STRIPE_MONTHLY_PRICE_ID,
					quantity: 1,
				},
			],
			client_reference_id: req.user.id,
			success_url: `${CLIENT_ORIGIN}/subscribe/success?session_id={CHECKOUT_SESSION_ID}`,
			cancel_url: `${CLIENT_ORIGIN}/subscribe`,
			// metadata attached to checkout session itself which stripe uses to track checkout sessions
			metadata: {
				appUserId: req.user.id,
			},
			// attached to subscription object created after user completes checkout,
			// so subscription webhooks can find the user without a session
			subscription_data: {
				metadata: {
					appUserId: req.user.id,
				},
			},
		});

		await recordCheckoutSession({
			userId: req.user.id,
			stripeCustomerId,
			stripeCheckoutSessionId: checkoutSession.id,
			stripePriceId: STRIPE_MONTHLY_PRICE_ID,
		});

		return res.json({ url: checkoutSession.url, reused: false });
	} catch (error) {
		console.error(error);
		return res.status(500).json({ error: "Checkout session creation failed." });
	}
},
);

billingRouter.post(
	"/portal-session",
	isAuthenticated,
	billingRateLimit,
	async (req, res) => {
	try {
		const stripeCustomerId = await findStripeCustomerIdForUser(req.user.id);

		if (!stripeCustomerId) {
			return res
				.status(400)
				.json({ error: "No Stripe customer is linked to this user." });
		}

		const stripe = getStripeClient();
		const portalSession = await stripe.billingPortal.sessions.create({
			customer: stripeCustomerId,
			return_url: `${CLIENT_ORIGIN}/subscribe`,
		});

		return res.json({ url: portalSession.url });
	} catch (error) {
		console.error(error);
		return res.status(500).json({ error: "Portal session creation failed." });
	}
},
);
