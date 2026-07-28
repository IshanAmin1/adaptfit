import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import type { AuthUser } from "../../types/auth";

type RequireAuthProps = {
	authChecked: boolean;
	authUser: AuthUser | null;
	children: ReactNode;
};

export default function RequireAuth({
	authChecked,
	authUser,
	children,
}: RequireAuthProps) {
	if (!authChecked) {
		return (
			<div className="grid min-h-[calc(100vh-78px)] place-items-center px-4 text-sm font-black uppercase tracking-[0.08em] text-[#5b6b86]">
				Loading
			</div>
		);
	}

	if (!authUser) {
		return <Navigate to="/login" replace />;
	}

	return children;
}
