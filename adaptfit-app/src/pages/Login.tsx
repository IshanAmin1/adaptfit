import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";
import { useNavigate } from "react-router-dom";
import type { AuthUser } from "../types/auth";

type GoogleCredentialPayload = {
	given_name?: string;
	name?: string;
};

type LoginProps = {
	onLogin: (user: AuthUser) => void;
};

const getGoogleProfile = (credential: string): AuthUser => {
	const payload = jwtDecode<GoogleCredentialPayload>(credential);

	return {
		firstName: payload.given_name || payload.name?.split(" ")[0] || "user",
	};
};

export default function Login({ onLogin }: LoginProps) {
	const navigate = useNavigate();

	const handleGoogleSuccess = (credentialResponse: CredentialResponse) => {
		if (!credentialResponse.credential) {
			handleGoogleError();
			return;
		}

		const user = getGoogleProfile(credentialResponse.credential);
		onLogin(user);
		navigate("/", { replace: true });
	};

	const handleGoogleError = () => {
		console.error("Google login failed");
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
				</div>
			</section>
		</div>
	);
}
