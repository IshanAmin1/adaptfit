import DashboardCard from "../components/common/DashboardCard";
import SectionHeading from "../components/common/SectionHeading";
import ChevronDown from "../components/icons/ChevronDown.js";
import ChevronUp from "../components/icons/ChevronUp.js";
import ExerciseDemoTrigger from "../components/plan/ExerciseDemoTrigger";
import { MuscleGroupChart } from "../components/plan/PlanCharts";
import PlanState from "../components/plan/PlanState";
import { useLatestPlan } from "../hooks/useLatestPlan";
import type { AuthUser } from "../types/auth";
import { formatEquipment, formatGeneratedDate } from "../utils/plan-utils";

type PlanProps = {
	authUser: AuthUser | null;
};

function getPlanTitle(authUser: AuthUser | null) {
	const name =
		authUser?.firstName || authUser?.fullName || authUser?.email?.split("@")[0];

	return name ? `${name}'s Plan` : "Your Plan";
}

export default function Plan({ authUser }: PlanProps) {
	const { plan, isLoading, errorMessage } = useLatestPlan();

	if (isLoading) {
		return (
			<div className="mx-auto grid w-full max-w-336 grid-cols-1 gap-6 px-4 pb-12 pt-8 md:px-12 lg:grid-cols-12">
				<PlanState title="Loading plan" message="Fetching your weekly plan." />
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
					message="Generate your first plan from onboarding before viewing the week."
				/>
			</div>
		);
	}

	const onboardingItems = plan.onboardingProfile
		? [
				["Experience", plan.onboardingProfile.experienceLevel],
				["Location", plan.onboardingProfile.trainingLocation],
				[
					"Equipment",
					formatEquipment(plan.onboardingProfile.equipmentAvailable),
				],
				[
					"Available days",
					plan.onboardingProfile.availableDays?.length
						? plan.onboardingProfile.availableDays.join(", ")
						: "Not provided",
				],
				["Session length", plan.onboardingProfile.preferredSessionLength],
				[
					"Limitations",
					plan.onboardingProfile.injuriesOrLimitations || "Not provided",
				],
				["Diet type", plan.onboardingProfile.dietType],
				[
					"Foods to avoid",
					plan.onboardingProfile.allergiesOrFoodsToAvoid || "Not provided",
				],
				[
					"Preferred meals/day",
					plan.onboardingProfile.mealFrequencyPreference || "Not provided",
				],
			]
		: [];

	return (
		<div className="mx-auto grid w-full max-w-336 grid-cols-1 gap-6 px-4 pb-12 pt-8 md:px-12 lg:grid-cols-12">
			<DashboardCard className="p-8 lg:col-span-12">
				<div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
					<SectionHeading
						eyebrow="Weekly plan"
						title={getPlanTitle(authUser)}
					/>
				</div>
			</DashboardCard>

			<DashboardCard className="p-8 lg:col-span-5">
				<SectionHeading eyebrow="Plan details" title="Overview" />
				<div className="mt-6 grid gap-4">
					<div className="rounded-lg border border-[#d9e5df] bg-[#f6faf7] p-4">
						<p className="m-0 text-xs font-black uppercase tracking-widest text-[#62706b]">
							Primary goal
						</p>
						<p className="mt-2 text-lg font-black capitalize text-[#17211f]">
							{plan.metadata.user_goal.replace(/_/g, " ")}
						</p>
					</div>
					<div className="rounded-lg border border-[#d9e5df] bg-[#f6faf7] p-4">
						<p className="m-0 text-xs font-black uppercase tracking-widest text-[#62706b]">
							Target description
						</p>
						<p className="mt-2 text-sm leading-6 text-[#17211f]">
							{plan.targets.target_physique_description}
						</p>
					</div>
					<div className="rounded-lg border border-[#d9e5df] bg-[#f6faf7] p-4">
						<p className="m-0 text-xs font-black uppercase tracking-widest text-[#62706b]">
							Generated
						</p>
						<p className="mt-2 text-sm font-black text-[#17211f]">
							{formatGeneratedDate(plan.generatedAt)}
						</p>
					</div>
					<div>
						<p className="mb-3 text-xs font-black uppercase tracking-widest text-[#62706b]">
							Training focus
						</p>
						<MuscleGroupChart exercises={plan.exercises} />
					</div>
				</div>
			</DashboardCard>

			<DashboardCard className="p-8 lg:col-span-7">
				<SectionHeading eyebrow="Preferences" title="User Summary" />
				{onboardingItems.length ? (
					<div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
						{onboardingItems.map(([label, value]) => (
							<div
								key={label}
								className="rounded-lg border border-[#d9e5df] bg-[#f6faf7] p-4"
							>
								<p className="m-0 text-xs font-black uppercase tracking-widest text-[#62706b]">
									{label}
								</p>
								<p className="mt-2 text-sm font-black capitalize leading-5 text-[#17211f]">
									{value.replace(/_/g, " ")}
								</p>
							</div>
						))}
					</div>
				) : (
					<p className="mt-6 rounded-lg border border-[#d9e5df] bg-[#f6faf7] p-4 text-sm font-semibold text-[#62706b]">
						Onboarding details are not available for this saved plan.
					</p>
				)}
			</DashboardCard>

			<DashboardCard className="p-8 lg:col-span-12">
				<SectionHeading eyebrow="Nutrition summary" title="Daily Targets" />
				<div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
					{[
						["Daily calories", `${plan.nutrients.daily_calories} kcal`],
						["Meal frequency", `${plan.nutrients.meal_frequency} meals`],
						["Protein target", `${plan.nutrients.macros.protein_g}g`],
					].map(([label, value]) => (
						<div
							key={label}
							className="rounded-lg border border-[#d9e5df] bg-[#f6faf7] p-4"
						>
							<p className="m-0 text-xs font-black uppercase tracking-widest text-[#62706b]">
								{label}
							</p>
							<p className="mt-2 text-sm font-black leading-5 text-[#17211f]">
								{value}
							</p>
						</div>
					))}
				</div>
			</DashboardCard>

			<DashboardCard className="p-8 lg:col-span-12">
				<SectionHeading eyebrow="Exercises" title="Weekly Schedule" />
				<div className="grid gap-3 mt-6">
					{plan.schedule.map((session) => (
						<details
							key={`${session.day}-${session.session_type}`}
							className="group rounded-lg border border-[#d9e5df] bg-[#f6faf7] p-0"
						>
							<summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 marker:hidden">
								<div className="min-w-0">
									<p className="m-0 text-xs font-black uppercase tracking-widest text-[#0f8b6f]">
										{session.day}
									</p>
									<p className="mt-1 truncate text-lg font-black text-[#17211f]">
										{session.session_type}
									</p>
								</div>
								<div className="flex items-center justify-center gap-3">
									<p className="m-0 text-lg leading-none font-black text-[#17211f] whitespace-nowrap">
										{session.duration_minutes} min
									</p>
									<span className="block group-open:hidden">
										<ChevronDown />
									</span>
									<span className="hidden group-open:block">
										<ChevronUp />
									</span>
								</div>
							</summary>

							<div className="grid gap-3 border-t border-[#d9e5df] p-4">
								{session.exercises.map((exercise, index) => (
									<div
										key={`${exercise.exercise_name}-${index}`}
										className="rounded-lg border border-[#d9e5df] bg-white p-4"
									>
										<div className="flex flex-col justify-between gap-2 sm:flex-row">
											<div>
												<p className="m-0 text-base font-black text-[#17211f]">
													{exercise.exercise_name}
												</p>
												<p className="mt-1 text-sm font-semibold text-[#62706b]">
													{exercise.target_muscle_group}
												</p>
											</div>
											<div className="flex flex-col items-start gap-2 sm:items-end">
												<p className="m-0 text-sm font-black text-[#0f8b6f]">
													{exercise.sets} sets x {exercise.reps}
												</p>
												<ExerciseDemoTrigger
													exercise={exercise}
													className="h-9 rounded-lg border border-[#0f8b6f] bg-white px-3 text-xs font-black uppercase text-[#0f8b6f] disabled:cursor-not-allowed disabled:opacity-60"
													fallbackClassName="text-xs font-black uppercase text-[#0f8b6f] underline underline-offset-3"
												/>
											</div>
										</div>
										<p className="mt-3 text-sm leading-5 text-[#62706b]">
											Equipment: {formatEquipment(exercise.equipment_needed)}
										</p>
										{exercise.alternatives.length ? (
											<p className="mt-2 text-sm leading-5 text-[#62706b]">
												Alternatives:{" "}
												{exercise.alternatives
													.map((alternative) => alternative.exercise_name)
													.join(", ")}
											</p>
										) : null}
									</div>
								))}
							</div>
						</details>
					))}
				</div>
			</DashboardCard>
		</div>
	);
}
