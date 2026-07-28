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
			<section className="mx-auto grid w-full max-w-5xl -translate-y-5 overflow-hidden rounded-xl border border-[#d6e2f5] bg-white shadow-[0_24px_70px_rgba(23,33,31,0.10)] md:grid-cols-[0.9fr_1.1fr]">
				<div className="flex min-h-132 flex-col justify-center bg-[#eef5ff] p-6 sm:p-10 lg:p-12">
					<div className="mx-auto flex w-full max-w-104 flex-col gap-8">
						<div>
							<p className="mb-3 text-xs font-black uppercase tracking-widest text-[#2563eb]">
								Sign in
							</p>
							<h2 className="m-0 text-[clamp(2rem,7vw,2.75rem)] font-black leading-none text-[#111827]">
								Train smarter. Adapt faster.
							</h2>
							<p className="mt-4 text-base leading-7 text-[#5b6b86]">
								Use your Google account to continue.
							</p>
						</div>

						<div className="flex flex-col gap-4">
							<button
								type="button"
								onClick={handleGoogleLogin}
								className="flex min-h-11 w-full items-center justify-center gap-3 rounded-xl border border-[#9db4d8] bg-white px-4 py-3 text-sm font-black text-[#111827] shadow-[0_10px_30px_rgba(37,99,235,0.10)] transition hover:-translate-y-0.5 hover:border-[#2563eb] hover:text-[#2563eb] focus:outline-none focus:ring-3 focus:ring-[#2563eb]/25"
							>
								<svg
									aria-hidden="true"
									viewBox="0 0 24 24"
									className="h-5 w-5 shrink-0"
									focusable="false"
								>
									<path
										fill="#4285F4"
										d="M21.35 11.1H12v2.96h5.36c-.23 1.39-1 2.57-2.18 3.37v2.8h3.52c2.06-1.9 3.25-4.7 3.25-8.05 0-.77-.07-1.52-.21-2.28z"
									/>
									<path
										fill="#34A853"
										d="M12 22c2.94 0 5.41-.97 7.21-2.64l-3.52-2.8c-.98.66-2.23 1.05-3.69 1.05-2.83 0-5.23-1.91-6.09-4.48H2.28v2.88A10 10 0 0 0 12 22z"
									/>
									<path
										fill="#FBBC05"
										d="M5.91 13.13A6 6 0 0 1 5.6 11c0-.74.13-1.46.31-2.13V6H2.28A10 10 0 0 0 2 11c0 1.62.39 3.15 1.08 4.5l2.83-2.37z"
									/>
									<path
										fill="#EA4335"
										d="M12 4.47c1.6 0 3.04.55 4.18 1.63l3.13-3.13C17.4 1.15 14.94 0 12 0 7.69 0 3.96 2.48 2.28 6l3.63 2.87C6.77 6.38 9.17 4.47 12 4.47z"
									/>
								</svg>
								Continue with Google
							</button>
							{errorMessage ? (
								<p
									className="m-0 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
									role="alert"
								>
									{errorMessage}
								</p>
							) : null}
						</div>
					</div>
				</div>

				<div className="hidden bg-[#e8f1ff] p-4 md:block">
					<img
						src={loginImage}
						alt="AdaptFit dashboard preview"
						className="h-full min-h-124 w-full rounded-xl object-cover"
					/>
				</div>
			</section>
		</div>
	);
}
