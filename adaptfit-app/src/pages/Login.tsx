import { useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { authService } from "../api/auth-service";
import loginImage from "../assets/login-image.jpg";
import type { AuthUser } from "../types/auth";
import { getAuthenticatedPath } from "../utils/auth-utils";

type LoginProps = {
	authUser?: AuthUser | null;
};

export default function Login({ authUser }: LoginProps) {
	const [searchParams] = useSearchParams();
	const [errorMessage, setErrorMessage] = useState<string | null>(
		searchParams.has("oauth_error")
			? "Google login failed. Please try again."
			: null,
	);

	if (authUser) {
		return <Navigate to={getAuthenticatedPath(authUser)} replace />;
	}

	const handleGoogleLogin = () => {
		setErrorMessage(null);
		window.location.assign(authService.getGoogleLoginUrl());
	};

	return (
		<div className="mx-auto grid min-h-[calc(100vh-78px)] w-full max-w-336 items-center px-4 py-8 md:px-12">
			<section className="mx-auto grid w-full max-w-5xl -translate-y-5 overflow-hidden rounded-lg border border-[#d9e5df] bg-white shadow-[0_24px_70px_rgba(23,33,31,0.10)] md:grid-cols-[0.9fr_1.1fr]">
				<div className="flex min-h-132 flex-col justify-center bg-[#f0faf5] p-6 sm:p-10 lg:p-12">
					<div className="mx-auto flex w-full max-w-104 flex-col gap-8">
						<div>
							<p className="mb-3 text-xs font-black uppercase tracking-widest text-[#0f8b6f]">
								Sign in
							</p>
							<h2 className="m-0 text-[clamp(2rem,7vw,2.75rem)] font-black leading-none text-[#17211f]">
								Train smarter. Adapt faster.
							</h2>
							<p className="mt-4 text-base leading-7 text-[#62706b]">
								Use your Google account to continue.
							</p>
						</div>

						<div className="flex flex-col gap-4">
							<button
								type="button"
								onClick={handleGoogleLogin}
								className="flex min-h-11 w-full items-center justify-center rounded-lg border border-[#b7cbc2] bg-white px-4 py-3 text-sm font-black text-[#17211f] shadow-[0_10px_30px_rgba(15,139,111,0.08)] transition hover:-translate-y-0.5 hover:border-[#0f8b6f] hover:text-[#0f8b6f] focus:outline-none focus:ring-3 focus:ring-[#0f8b6f]/25"
							>
								Continue with Google
							</button>
							{errorMessage ? (
								<p
									className="m-0 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
									role="alert"
								>
									{errorMessage}
								</p>
							) : null}
						</div>
					</div>
				</div>

				<div className="hidden bg-[#e8f7ef] p-4 md:block">
					<img
						src={loginImage}
						alt="AdaptFit dashboard preview"
						className="h-full min-h-124 w-full rounded-lg object-cover"
					/>
				</div>
			</section>
		</div>
	);
}
