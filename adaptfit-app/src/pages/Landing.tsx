import { Link } from "react-router-dom";

export default function Landing() {
	return (
		<div className="mx-auto flex min-h-[calc(100vh-78px)] w-full max-w-336 flex-col justify-center gap-12 px-4 py-12 md:px-12">
			<section className="max-w-176">
				<p className="mb-4 text-xs font-black uppercase tracking-widest text-[#2563eb]">
					Adaptive fitness planning
				</p>
				<h1 className="m-0 text-[clamp(2.5rem,7vw,5.75rem)] font-black leading-[0.95] text-[#111827]">
					Welcome to AdaptFit
				</h1>
				<p className="mt-6 max-w-148 text-lg leading-8 text-[#526174]">
					AdaptFit helps you organize workouts, nutrition, progress, and AI
					insights in multiple informative dashboards that can adjust with your
					fitness goals.
				</p>
				<div className="mt-8 flex flex-wrap gap-3">
					<Link
						to="/login"
						className="rounded-xl bg-[#2563eb] px-5 py-3 font-black text-white no-underline"
					>
						Sign in to subscribe
					</Link>
				</div>
			</section>

			<section
				id="subscription"
				className="border-t border-[#d6e2f5] pt-8 text-[#526174]"
			>
				<h2 className="m-0 text-2xl font-black text-[#111827]">Subscription</h2>
				<p className="mt-3 max-w-120 leading-7">
					Premium plans will unlock the full AdaptFit coaching experience.
				</p>
			</section>
		</div>
	);
}
