import Stripe from "stripe";

let stripeClient;

export function getStripeClient() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not configured.");
  }

  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  }

  return stripeClient;
}

export function getStripeMonthlyPriceId() {
  if (!process.env.STRIPE_MONTHLY_PRICE_ID) {
    throw new Error("STRIPE_MONTHLY_PRICE_ID is not configured.");
  }

  return process.env.STRIPE_MONTHLY_PRICE_ID;
}

export function getClientOrigin() {
  return process.env.CLIENT_ORIGIN || "http://localhost:5173";
}
