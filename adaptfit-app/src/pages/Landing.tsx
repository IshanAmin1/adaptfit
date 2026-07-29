import { ButtonLink } from "../components/common/Button";

export default function Landing() {
	return (
		<div className="mx-auto flex min-h-[calc(100vh-78px)] w-full max-w-336 flex-col justify-center gap-12 px-4 py-12 md:px-12">
			<section className="max-w-176">
				<p className="mb-4 text-xs font-black uppercase tracking-widest text-primary">
					Adaptive fitness planning
				</p>
				<h1 className="m-0 text-[clamp(2.5rem,7vw,5.75rem)] font-black leading-[0.95] text-secondary">
					Welcome to AdaptFit
				</h1>
				<p className="mt-6 max-w-148 text-lg leading-8 text-muted-strong">
					AdaptFit helps you organize workouts, nutrition, progress, and AI
					insights in multiple informative dashboards that can adjust with your
					fitness goals.
				</p>
				<div className="mt-8 flex flex-wrap gap-3">
					<ButtonLink to="/login">Sign in to subscribe</ButtonLink>
				</div>
			</section>

			<section
				id="subscription"
				className="border-t border-border pt-8 text-muted-strong"
			>
				<h2 className="m-0 text-2xl font-black text-secondary">Subscription</h2>
				<p className="mt-3 max-w-120 leading-7">
					Premium plans will unlock the full AdaptFit coaching experience.
				</p>
			</section>
		</div>
	);
}
