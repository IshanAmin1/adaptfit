import DashboardCard from "./common/DashboardCard";
import ProgressBar from "./common/ProgressBar";
import SectionHeading from "./common/SectionHeading";
import ClockIcon from "./icons/ClockIcon";
import DumbbellIcon from "./icons/DumbbellIcon";
import { MacroDonut } from "./plan/PlanCharts";
import PlanState from "./plan/PlanState";
import { useLatestPlan } from "../hooks/useLatestPlan";
import {
	findTodaySession,
	formatEquipment,
	getTodayName,
} from "../utils/plan-utils";

function macroWidth(value: number, total: number) {
	if (!total) {
		return 0;
	}

	return Math.max(8, Math.min(100, Math.round((value / total) * 100)));
}

export default function Dashboard() {
	const { plan, isLoading, errorMessage } = useLatestPlan();
	const todaySession = findTodaySession(plan);
	const isWorkoutDay = Boolean(todaySession?.exercises.length);
	const todayName = getTodayName();

	if (isLoading) {
		return (
			<div className="mx-auto grid w-full max-w-336 grid-cols-1 gap-6 px-4 pb-12 pt-8 md:px-12 lg:grid-cols-12">
				<PlanState
					title="Loading plan"
					message="Fetching your latest generated plan."
				/>
			</div>
		);
	}

	if (errorMessage) {
		return (
			<div className="mx-auto grid w-full max-w-336 grid-cols-1 gap-6 px-4 pb-12 pt-8 md:px-12 lg:grid-cols-12">
				<PlanState title="Plan unavailable" message={errorMessage} />
			</div>
		);
	}

	if (!plan) {
		return (
			<div className="mx-auto grid w-full max-w-336 grid-cols-1 gap-6 px-4 pb-12 pt-8 md:px-12 lg:grid-cols-12">
				<PlanState
					title="No plan yet"
					message="Complete onboarding to generate your first weekly plan."
				/>
			</div>
		);
	}

	const macroTotal =
		plan.nutrients.macros.protein_g +
		plan.nutrients.macros.carbs_g +
		plan.nutrients.macros.fat_g;
	const primaryEquipment =
		todaySession && isWorkoutDay
			? formatEquipment(
					todaySession.exercises.flatMap(
						(exercise) => exercise.equipment_needed,
					),
				)
			: "None";
	const restDayMeal = plan.nutrients.sample_meals[0];

	return (
		<div className="mx-auto grid w-full max-w-336 grid-cols-1 gap-6 px-4 pb-12 pt-8 md:px-12 xl:grid-cols-12">
			<DashboardCard className="flex min-h-125 flex-col gap-7 p-8 xl:col-span-8">
				<div className="grid gap-5">
					<div>
						<p className="mb-3 text-xs font-black uppercase tracking-widest text-[#0f8b6f]">
							Today&apos;s plan
						</p>
						<h1 className="m-0 text-[clamp(1.8rem,3vw,2.6rem)] font-black uppercase leading-[1.08]">
							{isWorkoutDay ? todaySession?.session_type : "Rest day"}
						</h1>
						<p className="mt-3 text-xl font-black uppercase tracking-[0.08em] text-[#62706b]">
							{todaySession?.day || todayName}
						</p>
					</div>

					<div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_12rem]">
						<div className="flex items-start gap-3 rounded-lg border border-[#d9e5df] bg-[#f6faf7] p-4 text-[#17211f]">
							<span className="mt-0.5 grid h-9 w-9 flex-none place-items-center rounded-md bg-[#e0f5ee] text-[#0f8b6f]">
								<DumbbellIcon />
							</span>
							<div>
								<p className="m-0 text-xs font-black uppercase tracking-widest text-[#62706b]">
									{isWorkoutDay ? "Equipment" : "Recovery focus"}
								</p>
								<p className="mt-1 text-lg font-black leading-5">
									{isWorkoutDay ? primaryEquipment : "Rest, steps, mobility"}
								</p>
							</div>
						</div>
						<div className="flex items-center gap-3 rounded-lg border border-[#d9e5df] bg-[#f6faf7] p-4">
							<span className="grid h-10 w-10 flex-none place-items-center rounded-md bg-[#e0f5ee] text-[#0f8b6f]">
								<ClockIcon />
							</span>
							<div>
								<p className="m-0 text-xs font-black uppercase tracking-widest text-[#62706b]">
									{isWorkoutDay ? "Time" : "Meals"}
								</p>
								<p className="mt-1 text-lg font-black leading-5">
									{isWorkoutDay
										? `${todaySession?.duration_minutes} min`
										: `${plan.nutrients.meal_frequency} meals`}
								</p>
							</div>
						</div>
					</div>
				</div>

				{isWorkoutDay && todaySession ? (
					<>
						<div className="grid gap-3">
							<p className="m-0 text-xs font-black uppercase tracking-widest text-[#62706b]">
								Exercises
							</p>
							<div className="grid gap-3">
								{todaySession.exercises.map((exercise, index) => (
									<div
										key={`${exercise.exercise_name}-${index}`}
										className="flex items-center justify-between gap-4 rounded-lg bg-[#17322d] p-4 text-white"
									>
										<div className="min-w-0">
											<strong className="block text-base font-black leading-5">
												{exercise.exercise_name}
											</strong>
											<p className="mt-1 text-sm font-semibold text-[#c8f7e6]">
												{exercise.target_muscle_group}
											</p>
										</div>
										<p className="m-0 flex-none text-sm font-black text-[#c8f7e6]">
											{exercise.sets} sets x {exercise.reps}
										</p>
									</div>
								))}
							</div>
						</div>

						<button
							type="button"
							className="mt-auto self-start rounded-lg border-0 bg-[#0f8b6f] px-7.5 py-4.5 text-lg font-black uppercase text-white"
						>
							Log workout
						</button>
					</>
				) : (
					<div className="grid gap-4">
						<div className="rounded-lg border border-[#d9e5df] bg-[#f6faf7] p-5">
							<p className="m-0 text-xs font-black uppercase tracking-widest text-[#62706b]">
								Rest guidance
							</p>
							<p className="mt-2 text-base leading-6 text-[#17211f]">
								No workout is scheduled today. Keep movement light, hydrate, and
								use the nutrition targets to support recovery.
							</p>
						</div>
						<div className="grid grid-cols-1 gap-3 md:grid-cols-3">
							{[
								["Calories", `${plan.nutrients.daily_calories} kcal`],
								["Protein", `${plan.nutrients.macros.protein_g}g`],
								["Carbs", `${plan.nutrients.macros.carbs_g}g`],
							].map(([label, value]) => (
								<div
									key={label}
									className="rounded-lg bg-[#17322d] p-4 text-white"
								>
									<p className="m-0 text-xs font-black uppercase tracking-widest text-[#c8f7e6]">
										{label}
									</p>
									<p className="mt-2 text-lg font-black">{value}</p>
								</div>
							))}
						</div>
						{restDayMeal ? (
							<div className="rounded-lg border border-[#d9e5df] bg-white p-5">
								<p className="m-0 text-xs font-black uppercase tracking-widest text-[#0f8b6f]">
									Recovery meal
								</p>
								<p className="mt-2 text-base font-black text-[#17211f]">
									{restDayMeal.meal_name}
								</p>
								<p className="mt-1 text-sm leading-5 text-[#62706b]">
									{restDayMeal.description}
								</p>
							</div>
						) : null}
					</div>
				)}
			</DashboardCard>

			<DashboardCard className="p-7.5 xl:col-span-4">
				<SectionHeading
					eyebrow="Nutrition goals"
					title={`${plan.nutrients.daily_calories} kcal`}
					action={
						<span className="rounded-full bg-[#e0f5ee] px-2.75 py-2 text-xs font-black uppercase tracking-[0.08em] text-[#0f8b6f]">
							Today
						</span>
					}
				/>

				<div className="mt-7 grid gap-5">
					<MacroDonut
						protein={plan.nutrients.macros.protein_g}
						carbs={plan.nutrients.macros.carbs_g}
						fat={plan.nutrients.macros.fat_g}
					/>
					<ProgressBar
						label="Protein"
						value={`${plan.nutrients.macros.protein_g}g`}
						widthPercent={macroWidth(
							plan.nutrients.macros.protein_g,
							macroTotal,
						)}
						barClassName="bg-[#2567b8]"
					/>
					<ProgressBar
						label="Carbs"
						value={`${plan.nutrients.macros.carbs_g}g`}
						widthPercent={macroWidth(plan.nutrients.macros.carbs_g, macroTotal)}
						barClassName="bg-[#d99b22]"
					/>
					<ProgressBar
						label="Fat"
						value={`${plan.nutrients.macros.fat_g}g`}
						widthPercent={macroWidth(plan.nutrients.macros.fat_g, macroTotal)}
						barClassName="bg-[#f46f5e]"
					/>
				</div>

				{plan.nutrients.sample_meals[0] ? (
					<div className="mt-7 rounded-lg border border-[#d9e5df] bg-[#f6faf7] p-4">
						<p className="m-0 text-xs font-black uppercase tracking-widest text-[#62706b]">
							Recommended meal today
						</p>
						<p className="mt-2 text-base font-black text-[#17211f]">
							{plan.nutrients.sample_meals[0].meal_name}
						</p>
						<p className="mt-1 text-sm leading-5 text-[#62706b]">
							{plan.nutrients.sample_meals[0].description}
						</p>
						<p className="mt-2 text-xs font-black uppercase tracking-widest text-[#0f8b6f]">
							{plan.nutrients.sample_meals[0].estimated_calories} kcal
						</p>
					</div>
				) : null}
			</DashboardCard>
		</div>
	);
}
