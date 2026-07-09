import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import type { AuthUser } from "../../types/auth";

type RequireSubscriptionProps = {
	authChecked: boolean;
	authUser: AuthUser | null;
	children: ReactNode;
};

export default function RequireSubscription({
	authChecked,
	authUser,
	children,
}: RequireSubscriptionProps) {
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

	if (!authUser.hasActiveSubscription) {
		return <Navigate to="/subscribe" replace />;
	}

	return children;
}
