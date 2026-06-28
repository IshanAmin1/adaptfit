import DashboardCard from "./common/DashboardCard";
import StatTile from "./common/StatTile";
import WorkoutStep from "./common/WorkoutStep";

export default function WorkoutPlanCard() {
	return (
		<DashboardCard
			id="today"
			className="flex min-h-125 flex-col gap-7 p-8 lg:col-span-8"
		>
			<div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-start">
				<div>
					<p className="mb-3 text-xs font-black uppercase tracking-widest text-[#0f8b6f]">
						Today&apos;s AI-generated plan
					</p>
					<h1 className="m-0 max-w-155 text-[clamp(2.5rem,5vw,3.875rem)] font-black uppercase leading-[1.02]">
						Upper Body Strength
					</h1>
				</div>
				<div
					aria-label="Plan completion 25 percent"
					className="grid h-31 w-31 flex-none place-items-center rounded-full bg-[radial-gradient(circle_at_center,white_0_55%,transparent_56%),conic-gradient(#0f8b6f_0_25%,#e6eee9_25%_100%)]"
				>
					<span className="text-[28px] font-black">25%</span>
				</div>
			</div>

			<div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_1fr_2fr]">
				<StatTile label="Estimated Time" value="48 min" />
				<StatTile label="Intensity" value="Moderate" />
				<StatTile
					label="Generated From"
					value="Goals, equipment, experience, diet"
					valueClassName="text-[22px]"
				/>
			</div>

			<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
				<WorkoutStep
					index={1}
					title="Dumbbell bench press"
					subtitle="4 sets x 8 reps"
				/>
				<WorkoutStep
					index={2}
					title="One-arm row"
					subtitle="4 sets x 10 reps"
				/>
				<WorkoutStep
					index={3}
					title="Shoulder press"
					subtitle="3 sets x 9 reps"
				/>
			</div>

			<button className="mt-auto self-start rounded-lg border-0 bg-[#0f8b6f] px-7.5 py-4.5 text-lg font-black uppercase text-white">
				Start workout
			</button>
		</DashboardCard>
	);
}
