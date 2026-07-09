import { getBillingStatusForUser } from "../models/subscriptions.js";

export async function hasActiveSubscription(req, res, next) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: "Not Authenticated" });
    }

    const billingStatus = await getBillingStatusForUser(req.user.id);

    if (!billingStatus.hasActiveSubscription) {
      return res.status(402).json({ error: "Active subscription required." });
    }

    req.billingStatus = billingStatus;
    next();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Subscription check failed." });
  }
}
