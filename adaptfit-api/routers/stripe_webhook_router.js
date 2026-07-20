import express, { Router } from "express";
import { upsertStripeSubscription } from "../utils/models/subscriptions.js";
import { getStripeClient } from "../services/stripe.js";
import { STRIPE_WEBHOOK_SECRET } from "../config/env/stripe.js";

export const stripeWebhookRouter = Router();

async function syncSubscription(stripeSubscriptionId) {
	const stripe = getStripeClient();
	const stripeSubscription =
		await stripe.subscriptions.retrieve(stripeSubscriptionId);

	await upsertStripeSubscription(stripeSubscription);
}

// Webhook endpoint for Stripe webhooks.
// Note this endpoint is not session-authenticated, it uses signature verification (with the STRIPE_WEBHOOK_SECRET)
// instead of session authentication because Stripe webhooks are sent from Stripe's servers and not from the user's browser.
stripeWebhookRouter.post(
	"/webhook",
	express.raw({ type: "application/json" }),
	async (req, res) => {
		try {
			const stripe = getStripeClient();
			const signatureHeader = req.headers["stripe-signature"];
			const signature = Array.isArray(signatureHeader)
				? signatureHeader[0]
				: signatureHeader;
			if (!signature) {
				return res.status(400).json({ error: "Missing Stripe signature." });
			}
			const event = stripe.webhooks.constructEvent(
				req.body,
				signature,
				STRIPE_WEBHOOK_SECRET,
			);

			/*
       We handle the following events:
       - checkout.session.completed: When a user completes the checkout process, we sync the subscription.
       - customer.subscription.created: When a new subscription is created, we upsert it.
       - customer.subscription.updated: When a subscription is updated, we upsert it.
       - customer.subscription.deleted: When a subscription is deleted, we upsert it.
       - invoice.paid: When an invoice is paid, we sync the subscription.
       - invoice.payment_failed: When an invoice payment fails, we sync the subscription. 

       Stripe docs: https://stripe.com/docs/webhooks/build
       Stripe API docs: https://docs.stripe.com/api/events/types
      */
			switch (event.type) {
				case "checkout.session.completed": {
					const checkoutSession = event.data.object;

					if (checkoutSession.mode === "subscription") {
						const stripeSubscriptionId =
							typeof checkoutSession.subscription === "string"
								? checkoutSession.subscription
								: checkoutSession.subscription?.id;

						if (stripeSubscriptionId) {
							await syncSubscription(stripeSubscriptionId);
						}
					}

					break;
				}
				case "customer.subscription.created":
				case "customer.subscription.updated":
				case "customer.subscription.deleted": {
					await upsertStripeSubscription(event.data.object);
					break;
				}
				case "invoice.paid":
				case "invoice.payment_failed": {
					const invoice = event.data.object;
					const stripeSubscriptionId =
						typeof invoice.subscription === "string"
							? invoice.subscription
							: invoice.subscription?.id;

					if (stripeSubscriptionId) {
						await syncSubscription(stripeSubscriptionId);
					}

					break;
				}
				default:
					break;
			}

			return res.json({ received: true });
		} catch (error) {
			console.error(error);
			return res.status(400).json({ error: "Stripe webhook failed." });
		}
	},
);
