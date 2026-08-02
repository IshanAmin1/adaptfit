export type UserSubscription = {
	id: string;
	status: string;
	stripePriceId?: string | null;
	stripeProductId?: string | null;
	currentPeriodStart?: string | null;
	currentPeriodEnd?: string | null;
	cancelAtPeriodEnd: boolean;
	cancelAt?: string | null;
	canceledAt?: string | null;
	endedAt?: string | null;
};

export type AuthUser = {
	id: string;
	email: string;
	firstName: string;
	lastName?: string | null;
	fullName?: string | null;
	avatarUrl?: string | null;
	hasActiveSubscription: boolean;
	hasCompletedOnboarding: boolean;
	hasGeneratedPlan: boolean;
	subscription?: UserSubscription | null;
};
