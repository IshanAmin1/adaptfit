import { useEffect, useMemo, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { billingService } from "../api/billing-service";
import type { AuthUser } from "../types/auth";

type SubscribeProps = {
	authChecked: boolean;
	authUser: AuthUser | null;
	onUserRefresh: () => Promise<AuthUser | null>;
};

function formatSubscriptionDate(value?: string | null) {
	if (!value) {
		return null;
	}

	return new Intl.DateTimeFormat(undefined, {
		month: "short",
		day: "numeric",
		year: "numeric",
	}).format(new Date(value));
}

function getSubscribedPath(user: AuthUser) {
	return user.hasCompletedOnboarding ? "/dashboard" : "/onboarding";
}

export default function Subscribe({
	authChecked,
	authUser,
	onUserRefresh,
}: SubscribeProps) {
	const location = useLocation();
	const navigate = useNavigate();
	const [isLoading, setIsLoading] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const isSuccessReturn = location.pathname === "/subscribe/success";
	const authUserId = authUser?.id;
	// cache the subscription date text to avoid unnecessary re-renders when the authUser object changes
	const subscriptionDateText = useMemo(() => {
		const subscription = authUser?.subscription;

		if (!subscription) {
			return null;
		}

		if (subscription.endedAt) {
			const endedDate = formatSubscriptionDate(subscription.endedAt);
			return endedDate ? `Ended ${endedDate}.` : "Ended.";
		}

		if (subscription.cancelAt) {
			const cancelDate = formatSubscriptionDate(subscription.cancelAt);
			return cancelDate ? `Access ends ${cancelDate}.` : "Canceling soon.";
		}

		if (subscription.cancelAtPeriodEnd) {
			const periodEndDate = formatSubscriptionDate(
				subscription.currentPeriodEnd,
			);
			return periodEndDate
				? `Access ends ${periodEndDate}.`
				: "Access ends at the end of the billing period.";
		}

		if (authUser?.hasActiveSubscription) {
			const renewalDate = formatSubscriptionDate(subscription.currentPeriodEnd);
			return renewalDate ? `Renews ${renewalDate}.` : null;
		}

		if (subscription.canceledAt) {
			const canceledDate = formatSubscriptionDate(subscription.canceledAt);
			return canceledDate ? `Canceled ${canceledDate}.` : "Canceled.";
		}

		return null;
	}, [authUser?.hasActiveSubscription, authUser?.subscription]);

	useEffect(() => {
		let isMounted = true;

		if (authChecked && authUserId && isSuccessReturn) {
			// Stripe webhooks can lag behind the redirect, so force a sync before
			// refreshing the local auth user shown on this page.
			billingService
				.syncSubscription()
				.then(() => onUserRefresh())
				.catch(() => {
					if (isMounted) {
						setErrorMessage("Subscription status could not be refreshed.");
					}
				});
		}

		return () => {
			isMounted = false;
		};
	}, [authChecked, authUserId, isSuccessReturn, onUserRefresh]);

	if (!authChecked) {
		return (
			<div className="grid min-h-[calc(100vh-78px)] place-items-center px-4 text-sm font-black uppercase tracking-[0.08em] text-[#62706b]">
				Loading
			</div>
		);
	}

	if (!authUser) {
		return <Navigate to="/login" replace />;
	}

	const handleCheckout = () => {
		setIsLoading(true);
		setErrorMessage(null);

		billingService
			.createCheckoutSession()
			.then((response) => {
				if (response.alreadySubscribed) {
					return onUserRefresh().then((user) => {
						if (user) {
							navigate(getSubscribedPath(user), { replace: true });
						}
					});
				}

				if (!response.url) {
					throw new Error("Stripe Checkout URL was missing.");
				}

				window.location.assign(response.url);
			})
			.catch(() => {
				setErrorMessage("Subscription checkout could not be started.");
			})
			.finally(() => {
				setIsLoading(false);
			});
	};

	const handleManageBilling = () => {
		setIsLoading(true);
		setErrorMessage(null);

		billingService
			.createPortalSession()
			.then((response) => {
				if (!response.url) {
					throw new Error("Stripe portal URL was missing.");
				}

				window.location.assign(response.url);
			})
			.catch(() => {
				setErrorMessage("Stripe billing portal could not be opened.");
			})
			.finally(() => {
				setIsLoading(false);
			});
	};

	return (
		<div className="mx-auto grid min-h-[calc(100vh-78px)] w-full max-w-336 items-center px-4 py-8 md:px-12">
			<section className="mx-auto grid w-full max-w-256 gap-8 rounded-lg border border-[#d9e5df] bg-white p-6 shadow-[0_24px_70px_rgba(23,33,31,0.10)] md:grid-cols-[1fr_0.85fr] md:p-10">
				<div className="flex flex-col justify-center gap-6">
					<div>
						<p className="mb-3 text-xs font-black uppercase tracking-[0.1em] text-[#0f8b6f]">
							AdaptFit membership
						</p>
						<h1 className="m-0 text-[clamp(2rem,6vw,3.5rem)] font-black leading-none text-[#17211f]">
							Monthly access
						</h1>
						<p className="mt-4 max-w-142 text-base leading-7 text-[#62706b]">
							Subscribe to unlock your dashboard, workout plan, nutrition
							summary, progress tracking, and AI insights.
						</p>
					</div>

					<div className="flex flex-wrap gap-3">
						{authUser.hasActiveSubscription ? (
							<>
								<button
									type="button"
									className="rounded-lg bg-[#0f8b6f] px-5 py-3 font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
									disabled={isLoading}
									onClick={() => navigate(getSubscribedPath(authUser))}
								>
									{authUser.hasCompletedOnboarding
										? "Open dashboard"
										: "Start onboarding"}
								</button>
								<button
									type="button"
									className="rounded-lg border border-[#b7cbc2] bg-white px-5 py-3 font-black text-[#17211f] disabled:cursor-not-allowed disabled:opacity-60"
									disabled={isLoading}
									onClick={handleManageBilling}
								>
									Open billing portal
								</button>
							</>
						) : (
							<>
								<button
									type="button"
									className="rounded-lg bg-[#0f8b6f] px-5 py-3 font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
									disabled={isLoading}
									onClick={handleCheckout}
								>
									Subscribe monthly
								</button>
							</>
						)}
					</div>

					{errorMessage ? (
						<p
							className="m-0 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
							role="alert"
						>
							{errorMessage}
						</p>
					) : null}
				</div>

				<div className="grid content-center gap-4 rounded-lg bg-[#f0faf5] p-6">
					<div>
						<p className="m-0 text-xs font-black uppercase tracking-[0.1em] text-[#62706b]">
							Signed in as
						</p>
						<p className="mt-2 break-words text-lg font-black text-[#17211f]">
							{authUser.email}
						</p>
					</div>
					<div className="h-px bg-[#d9e5df]" />
					<div>
						<p className="m-0 text-xs font-black uppercase tracking-[0.1em] text-[#62706b]">
							Status
						</p>
						<p className="mt-2 text-2xl font-black text-[#17211f]">
							{authUser.hasActiveSubscription ? "Active" : "Payment required"}
						</p>
						{subscriptionDateText ? (
							<p className="mt-2 text-sm font-semibold leading-6 text-[#62706b]">
								{subscriptionDateText}
							</p>
						) : null}
						{isSuccessReturn && !authUser.hasActiveSubscription ? (
							<p className="mt-2 text-sm font-semibold leading-6 text-[#62706b]">
								Payment is being confirmed. This usually updates after Stripe
								finishes processing.
							</p>
						) : null}
					</div>
				</div>
			</section>
		</div>
	);
}
