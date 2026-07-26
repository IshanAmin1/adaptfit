import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { authService } from "../api/auth-service";
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
			<section className="w-full max-w-md rounded-lg border border-[#d9e5df] bg-white p-8 text-center shadow-[0_24px_70px_rgba(23,33,31,0.10)]">
				<h2 className="m-0 text-2xl font-black text-[#17211f]">
					Signing you in
				</h2>
				<p className="mt-3 text-sm leading-6 text-[#62706b]">
					Finishing your Google sign-in.
				</p>
				{errorMessage ? (
					<div className="mt-5 flex flex-col gap-3">
						<p
							className="m-0 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
							role="alert"
						>
							{errorMessage}
						</p>
						<button
							type="button"
							onClick={() => navigate("/login", { replace: true })}
							className="min-h-11 rounded-lg bg-[#0f8b6f] px-4 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-[#0b725b] focus:outline-none focus:ring-3 focus:ring-[#0f8b6f]/25"
						>
							Back to sign in
						</button>
					</div>
				) : null}
			</section>
		</div>
	);
}
