import { Subscription } from "../../models/index.js";

// in case there are more than one subscription status that can be considered active in future
export const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["active"]);

function toDate(unixTimestamp) {
	if (!unixTimestamp) {
		return null;
	}

	return new Date(unixTimestamp * 1000);
}

function getStripeId(value) {
	if (!value) {
		return null;
	}

	if (typeof value === "string") {
		return value;
	}

	if (typeof value === "object" && value !== null && "id" in value) {
		return value.id || null;
	}

	return null;
}

function serializeSubscription(subscription) {
	if (!subscription) {
		return null;
	}

	const plainSubscription = subscription.toJSON
		? subscription.toJSON()
		: subscription;

	return {
		id: plainSubscription.id,
		status: plainSubscription.status,
		stripePriceId: plainSubscription.stripe_price_id,
		stripeProductId: plainSubscription.stripe_product_id,
		currentPeriodStart: plainSubscription.current_period_start,
		currentPeriodEnd: plainSubscription.current_period_end,
		cancelAtPeriodEnd: plainSubscription.cancel_at_period_end,
		cancelAt: plainSubscription.cancel_at,
		canceledAt: plainSubscription.canceled_at,
		endedAt: plainSubscription.ended_at,
	};
}

export function hasPaidAccess(subscription) {
	return Boolean(
		subscription && ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status),
	);
}

export async function getBillingStatusForUser(userId) {
	const subscriptions = await Subscription.findAll({
		where: { user_id: userId },
		order: [["updated_at", "DESC"]],
	});
	// get the very first subscription that has paid access, or null if none exist
	const activeSubscription =
		subscriptions.find((subscription) => hasPaidAccess(subscription)) || null;
	const currentSubscription = activeSubscription || subscriptions[0] || null;

	return {
		hasActiveSubscription: Boolean(activeSubscription),
		subscription: serializeSubscription(currentSubscription),
	};
}

export async function findStripeCustomerIdForUser(userId) {
	const subscription = await Subscription.findOne({
		where: { user_id: userId },
		order: [["updated_at", "DESC"]],
	});

	return subscription?.stripe_customer_id || null;
}

// If a user abandons checkout and comes back,
// return the same Stripe-hosted URL instead of creating duplicate sessions
export async function findPendingCheckoutSessionForUser(userId, stripePriceId) {
	const subscription = await Subscription.findOne({
		where: {
			user_id: userId,
			stripe_price_id: stripePriceId,
			stripe_subscription_id: null,
			status: "checkout_pending",
		},
		order: [["updated_at", "DESC"]],
	});

	return subscription?.toJSON() || null;
}

export async function recordCheckoutSession({
	userId,
	stripeCustomerId,
	stripeCheckoutSessionId,
	stripePriceId,
}) {
	const [subscription] = await Subscription.upsert(
		{
			user_id: userId,
			stripe_customer_id: stripeCustomerId,
			stripe_checkout_session_id: stripeCheckoutSessionId,
			stripe_price_id: stripePriceId,
			status: "checkout_pending",
		},
		{
			conflictFields: ["stripe_checkout_session_id"],
			returning: true,
		},
	);

	return subscription?.toJSON();
}

export async function deleteCheckoutSession(subscriptionId) {
	const subscription = await Subscription.findByPk(subscriptionId);

	if (!subscription) {
		return null;
	}

	await subscription.destroy();

	return true;
}

/**
 * Syncs a Stripe subscription object with the local database.
 *
 * This function intelligently maps a Stripe subscription to an AdaptFit user and handles
 * three different subscription scenarios:
 *
 * 1. Existing Subscription: If a subscription with this stripe_subscription_id already
 *    exists in the database, update it with the latest Stripe data (status changes,
 *    billing period updates, cancellation info, etc.).
 *
 * 2. Pending Checkout Resumption: If no subscription ID exists but there's a pending
 *    checkout session for this customer/price combination, assume the user completed
 *    checkout and fill in the subscription ID. This handles the case where a user
 *    abandons checkout, comes back, and completes it.
 *
 * 3. New Subscription: If neither case applies, create a new subscription record or
 *    upsert by stripe_subscription_id to handle edge cases.
 *
 * User Identification: The function derives the user ID from either:
 *   - stripeSubscription.metadata.appUserId (if webhook carries it)
 *   - customerSubscription.user_id (from existing related subscription record)
 * Throws if neither is available, preventing orphaned subscriptions.
 *
 * @param {Object} stripeSubscription - Stripe subscription object from API or webhook
 * @returns {Object} The upserted subscription as a plain JSON object
 * @throws {Error} If unable to map the subscription to an AdaptFit user
 */
export async function upsertStripeSubscription(stripeSubscription) {
	const stripeCustomerId = getStripeId(stripeSubscription.customer);
	const stripeSubscriptionId = stripeSubscription.id;
	const subscriptionItem = stripeSubscription.items?.data?.[0] || null;
	const price = subscriptionItem?.price || null;
	// case where user has an existing subscription
	const existingSubscription = await Subscription.findOne({
		where: { stripe_subscription_id: stripeSubscriptionId },
	});
	// case where user abandons checkout and comes back, and completes it
	const pendingCheckoutSubscription = existingSubscription
		? null
		: await Subscription.findOne({
				where: {
					stripe_customer_id: stripeCustomerId,
					stripe_subscription_id: null,
					status: "checkout_pending",
					...(price?.id ? { stripe_price_id: price.id } : {}),
				},
				order: [["updated_at", "DESC"]],
			});
	// handles case where user has no subscription yet
	const customerSubscription =
		existingSubscription ||
		pendingCheckoutSubscription ||
		(await Subscription.findOne({
			where: { stripe_customer_id: stripeCustomerId },
			order: [["updated_at", "DESC"]],
		}));
	// derive the user ID from the stripe subscription metadata or the customer subscription record
	const userId =
		stripeSubscription.metadata?.appUserId || customerSubscription?.user_id;

	if (!userId) {
		throw new Error(
			`Unable to map Stripe subscription ${stripeSubscriptionId} to an AdaptFit user.`,
		);
	}

	const subscriptionValues = {
		user_id: userId,
		stripe_customer_id: stripeCustomerId,
		stripe_subscription_id: stripeSubscriptionId,
		stripe_price_id: price?.id || null,
		stripe_product_id: getStripeId(price?.product),
		status: stripeSubscription.status,
		current_period_start: toDate(subscriptionItem?.current_period_start),
		current_period_end: toDate(subscriptionItem?.current_period_end),
		cancel_at_period_end: Boolean(stripeSubscription.cancel_at_period_end),
		cancel_at: toDate(stripeSubscription.cancel_at),
		canceled_at: toDate(stripeSubscription.canceled_at),
		ended_at: toDate(stripeSubscription.ended_at),
	};

	// we don't upsert all three cases by stripe_subscription_id here because we want to handle the case where
	// a user abandons checkout and comes back, and completes it, which would create a new subscription with a
	// new stripe_subscription_id but the same stripe_customer_id and stripe_price_id
	if (existingSubscription) {
		await existingSubscription.update(subscriptionValues);
		return existingSubscription.toJSON();
	}

	if (pendingCheckoutSubscription) {
		await pendingCheckoutSubscription.update(subscriptionValues);
		return pendingCheckoutSubscription.toJSON();
	}

	const [subscription] = await Subscription.upsert(subscriptionValues, {
		conflictFields: ["stripe_subscription_id"],
		returning: true,
	});

	return subscription?.toJSON();
}
