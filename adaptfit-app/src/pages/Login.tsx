import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginWithGoogle } from "../api/auth";
import type { AuthUser } from "../types/auth";

type LoginProps = {
	onLogin: (user: AuthUser) => void;
};

export default function Login({ onLogin }: LoginProps) {
	const navigate = useNavigate();
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	const handleGoogleSuccess = async (
		credentialResponse: CredentialResponse,
	) => {
		if (!credentialResponse.credential) {
			handleGoogleError();
			return;
		}

		try {
			const user = await loginWithGoogle(credentialResponse.credential);
			onLogin(user);
			navigate("/", { replace: true });
		} catch {
			handleGoogleError();
		}
	};

	const handleGoogleError = () => {
		setErrorMessage("Google login failed. Please try again.");
	};

	return (
		<div className="flex min-h-[calc(100vh-78px)] items-center justify-center px-4 pt-[78px]">
			<section className="flex w-full max-w-[400px] flex-col gap-5 rounded-lg border border-[#d9e5df] bg-white/90 p-10 shadow-[0_18px_45px_rgba(23,33,31,0.08)]">
				<div>
					<p className="mb-3 text-xs font-black uppercase tracking-[0.1em] text-[#0f8b6f]">
						Welcome back
					</p>
					<h2 className="m-0 text-[28px] font-semibold leading-[1.15]">
						Access AdaptFit
					</h2>
				</div>

				<div className="flex flex-col gap-5">
					<GoogleLogin
						onSuccess={handleGoogleSuccess}
						onError={handleGoogleError}
						width="320"
					/>
					{errorMessage ? (
						<p className="m-0 text-sm font-semibold text-red-700" role="alert">
							{errorMessage}
						</p>
					) : null}
				</div>
			</section>
		</div>
	);
}
