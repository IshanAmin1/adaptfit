import { Router } from "express";
import { isAuthenticated } from "../middleware/auth.js";
import {
  findPendingCheckoutSessionForUser,
  findStripeCustomerIdForUser,
  getBillingStatusForUser,
  recordCheckoutSession,
  upsertStripeSubscription,
} from "../models/subscriptions.js";
import {
  getClientOrigin,
  getStripeClient,
  getStripeMonthlyPriceId,
} from "../services/stripe.js";

export const billingRouter = Router();

async function getOrCreateStripeCustomer(user) {
  const stripe = getStripeClient();
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

async function syncCustomerSubscriptions(stripe, stripeCustomerId) {
  const stripeSubscriptions = await stripe.subscriptions.list({
    customer: stripeCustomerId,
    status: "all",
    limit: 100,
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

  if (!pendingCheckoutSession?.stripe_checkout_session_id) {
    return null;
  }

  const checkoutSession = await stripe.checkout.sessions.retrieve(
    pendingCheckoutSession.stripe_checkout_session_id,
  );

  if (checkoutSession.status === "open" && checkoutSession.url) {
    return checkoutSession.url;
  }

  const stripeSubscriptionId =
    typeof checkoutSession.subscription === "string"
      ? checkoutSession.subscription
      : checkoutSession.subscription?.id;

  if (stripeSubscriptionId) {
    const stripeSubscription =
      await stripe.subscriptions.retrieve(stripeSubscriptionId);
    await upsertStripeSubscription(stripeSubscription);
  } else {
    await syncCustomerSubscriptions(stripe, stripeCustomerId);
  }

  return null;
}

billingRouter.get("/status", isAuthenticated, async (req, res) => {
  try {
    const stripe = getStripeClient();
    const stripeCustomerId = await findStripeCustomerIdForUser(req.user.id);

    if (stripeCustomerId) {
      await syncCustomerSubscriptions(stripe, stripeCustomerId);
    }

    const billingStatus = await getBillingStatusForUser(req.user.id);
    return res.json(billingStatus);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Billing status request failed." });
  }
});

billingRouter.post("/checkout-session", isAuthenticated, async (req, res) => {
  try {
    const stripe = getStripeClient();
    const monthlyPriceId = getStripeMonthlyPriceId();
    const clientOrigin = getClientOrigin();
    const stripeCustomerId = await getOrCreateStripeCustomer(req.user);

    await syncCustomerSubscriptions(stripe, stripeCustomerId);

    const billingStatus = await getBillingStatusForUser(req.user.id);

    if (billingStatus.hasActiveSubscription) {
      return res.json({ alreadySubscribed: true });
    }

    const reusableCheckoutUrl = await getReusableCheckoutUrl({
      stripe,
      userId: req.user.id,
      stripeCustomerId,
      stripePriceId: monthlyPriceId,
    });

    if (reusableCheckoutUrl) {
      return res.json({ url: reusableCheckoutUrl, reused: true });
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      line_items: [
        {
          price: monthlyPriceId,
          quantity: 1,
        },
      ],
      client_reference_id: req.user.id,
      success_url: `${clientOrigin}/subscribe/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${clientOrigin}/subscribe`,
      metadata: {
        appUserId: req.user.id,
      },
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
      stripePriceId: monthlyPriceId,
    });

    return res.json({ url: checkoutSession.url });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Checkout session creation failed." });
  }
});

billingRouter.post("/portal-session", isAuthenticated, async (req, res) => {
  try {
    const stripeCustomerId = await findStripeCustomerIdForUser(req.user.id);

    if (!stripeCustomerId) {
      return res
        .status(400)
        .json({ error: "No Stripe customer is linked to this user." });
    }

    const stripe = getStripeClient();
    const clientOrigin = getClientOrigin();
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${clientOrigin}/subscribe`,
    });

    return res.json({ url: portalSession.url });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Portal session creation failed." });
  }
});
