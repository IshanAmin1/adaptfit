import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { authService } from "../api/auth-service";
import { Button } from "../components/common/Button";
import type { AuthUser } from "../types/auth";
import { getAuthenticatedPath } from "../utils/auth-utils";

type AuthCallbackProps = {
	authUser?: AuthUser | null;
	onLogin: (user: AuthUser) => void;
};

export default function AuthCallback({ authUser, onLogin }: AuthCallbackProps) {
	const navigate = useNavigate();
	const hasStartedRef = useRef(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	useEffect(() => {
		if (hasStartedRef.current || authUser) {
			return;
		}

		hasStartedRef.current = true;

		authService
			.getCurrentUser()
			.then((user) => {
				if (!user) {
					throw new Error("Google login failed");
				}

				onLogin(user);
				navigate(getAuthenticatedPath(user), {
					replace: true,
				});
			})
			.catch(() => {
				setErrorMessage("Google login failed. Please try again.");
			});
	}, [authUser, navigate, onLogin]);

	if (authUser) {
		return <Navigate to={getAuthenticatedPath(authUser)} replace />;
	}

	return (
		<div className="mx-auto grid min-h-[calc(100vh-78px)] w-full max-w-336 place-items-center px-4 py-8 md:px-12">
			<section className="w-full max-w-md rounded-xl border border-border bg-white p-8 text-center shadow-[0_24px_70px_rgba(23,33,31,0.10)]">
				<h2 className="m-0 text-2xl font-black text-secondary">
					Signing you in
				</h2>
				<p className="mt-3 text-sm leading-6 text-muted">
					Finishing your Google sign-in.
				</p>
				{errorMessage ? (
					<div className="mt-5 flex flex-col gap-3">
						<p
							className="m-0 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
							role="alert"
						>
							{errorMessage}
						</p>
						<Button
							type="button"
							onClick={() => navigate("/login", { replace: true })}
							className="min-h-11 px-4 py-3 text-sm hover:-translate-y-0.5 focus:outline-none focus:ring-3 focus:ring-primary/25"
						>
							Back to sign in
						</Button>
					</div>
				) : null}
			</section>
		</div>
	);
}
