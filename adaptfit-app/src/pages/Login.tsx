import { FormEvent } from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {
	const navigate = useNavigate();

	const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		navigate("/");
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

				<form onSubmit={handleSubmit} className="flex flex-col gap-5">
					<div className="flex flex-col gap-2">
						<label
							className="text-xs font-black uppercase tracking-[0.1em] text-[#0f8b6f]"
							htmlFor="email"
						>
							Email Address
						</label>
						<input
							type="email"
							id="email"
							placeholder="name@example.com"
							required
							className="rounded-lg border border-[#d9e5df] px-3 py-3 text-sm outline-none transition focus:border-[#0f8b6f] focus:ring-2 focus:ring-[#0f8b6f]/20"
						/>
					</div>

					<div className="flex flex-col gap-2">
						<label
							className="text-xs font-black uppercase tracking-[0.1em] text-[#0f8b6f]"
							htmlFor="password"
						>
							Password
						</label>
						<input
							type="password"
							id="password"
							placeholder="••••••••"
							required
							className="rounded-lg border border-[#d9e5df] px-3 py-3 text-sm outline-none transition focus:border-[#0f8b6f] focus:ring-2 focus:ring-[#0f8b6f]/20"
						/>
					</div>

					<button
						type="submit"
						className="mt-2 w-full rounded-lg bg-[#17211f] px-[17px] py-[11px] font-black text-white"
					>
						Sign In
					</button>
				</form>
			</section>
		</div>
	);
}
