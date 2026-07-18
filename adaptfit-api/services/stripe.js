import Stripe from "stripe";
import { STRIPE_SECRET_KEY } from "../config/stripe.js";

let stripeClient;

export function getStripeClient() {
	if (!stripeClient) {
		stripeClient = new Stripe(STRIPE_SECRET_KEY);
	}

	return stripeClient;
}
