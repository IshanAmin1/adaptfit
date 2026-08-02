import { useEffect, useState } from "react";
import DashboardCard from "./common/DashboardCard";
import ProgressBar from "./common/ProgressBar";
import SectionHeading from "./common/SectionHeading";
import ClockIcon from "./icons/ClockIcon";
import DumbbellIcon from "./icons/DumbbellIcon";
import ExerciseDemoTrigger from "./plan/ExerciseDemoTrigger";
import LoggedWorkoutInfo from "./plan/LoggedWorkoutInfo";
import { MacroDonut } from "./plan/PlanCharts";
import PlanState from "./plan/PlanState";
import WorkoutLogModal from "./plan/WorkoutLogModal";
import { loggingService } from "../api/logging-service";
import { plansService } from "../api/plans-service";
import { useLatestPlan } from "../hooks/useLatestPlan";
import type { WorkoutLog } from "../types/plan";
import {
	findTodaySession,
	formatEquipment,
	formatPlanLabel,
	getTodayName,
} from "../utils/plan-utils";

function macroWidth(value: number, total: number) {
	if (!total) {
		return 0;
	}

	return Math.max(8, Math.min(100, Math.round((value / total) * 100)));
}

function getTodayInputValue() {
	return new Date().toISOString().slice(0, 10);
}

export default function Dashboard() {
	const { plan, setPlan, isLoading, errorMessage } = useLatestPlan();
	const [isWorkoutLogOpen, setIsWorkoutLogOpen] = useState(false);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);
	const [syncMessage, setSyncMessage] = useState<string | null>(null);
	const [syncErrorMessage, setSyncErrorMessage] = useState<string | null>(null);
	const [isSyncingPlan, setIsSyncingPlan] = useState(false);
	const [todayWorkoutLog, setTodayWorkoutLog] = useState<WorkoutLog | null>(
		null,
	);
	const todaySession = findTodaySession(plan);
	const isWorkoutDay = Boolean(todaySession?.exercises.length);
	const loggedWorkout = isWorkoutDay ? todayWorkoutLog : null;
	const todayName = getTodayName();
	const hasSyncedAfterTodayWorkout =
		Boolean(plan?.generatedAt && loggedWorkout?.createdAt) &&
		new Date(plan.generatedAt) > new Date(loggedWorkout.createdAt);

	useEffect(() => {
		if (!plan || !isWorkoutDay) {
			return;
		}

		let ignoreResult = false;

		async function loadTodayWorkoutLog() {
			try {
				const workoutLog =
					await loggingService.getTodayWorkoutLog(getTodayInputValue());

				if (!ignoreResult) {
					setTodayWorkoutLog(workoutLog);
				}
			} catch {
				if (!ignoreResult) {
					setTodayWorkoutLog(null);
				}
			}
		}

		loadTodayWorkoutLog();

		return () => {
			ignoreResult = true;
		};
	}, [plan, isWorkoutDay]);

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

	async function handleSyncToPlan() {
		if (!loggedWorkout) {
			setSuccessMessage(null);
			setSyncErrorMessage("Log today's workout before syncing to your plan.");
			return;
		}

		if (hasSyncedAfterTodayWorkout) {
			setSuccessMessage(null);
			setSyncErrorMessage(
				"You already synced your plan after today's workout.",
			);
			return;
		}

		setIsSyncingPlan(true);
		setSuccessMessage(null);
		setSyncErrorMessage(null);
		setSyncMessage("Starting plan update...");

		try {
			const planJob = await plansService.adaptPlan();
			setSyncMessage("Plan update queued.");

			const adaptedPlan = await plansService.streamPlanStatus(
				planJob.statusUrl,
				(event) => {
					setSyncMessage(event.message);
				},
			);

			if (adaptedPlan) {
				setPlan(adaptedPlan);
				setTodayWorkoutLog(null);
			}

			setSyncMessage("Plan updated. Check Plan tab.");
		} catch (error) {
			setSyncMessage(null);
			setSyncErrorMessage(
				error instanceof Error
					? error.message
					: "Plan sync could not be completed.",
			);
		} finally {
			setIsSyncingPlan(false);
		}
	}

	return (
		<div className="mx-auto grid w-full max-w-336 grid-cols-1 gap-6 px-4 pb-12 pt-8 md:px-12 xl:grid-cols-12">
			{isSyncingPlan ? (
				<div
					className="fixed inset-0 z-[80] grid place-items-center bg-secondary/70 px-4 backdrop-blur-sm"
					role="status"
					aria-live="polite"
				>
					<div className="w-full max-w-md rounded-xl border border-border bg-white p-7 text-center shadow-[0_24px_70px_rgba(23,33,31,0.25)]">
						<div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-primary-soft border-t-primary" />
						<p className="mt-5 text-xs font-black uppercase tracking-widest text-primary">
							Syncing plan
						</p>
						<p className="mt-3 text-lg font-black leading-6 text-secondary">
							{syncMessage || "Updating your plan..."}
						</p>
						<p className="mt-4 text-sm font-semibold leading-5 text-muted">
							Syncs weekly on Sundays automatically as well :)
						</p>
					</div>
				</div>
			) : null}

			{isWorkoutLogOpen && todaySession ? (
				<WorkoutLogModal
					planId={plan.id}
					session={todaySession}
					onClose={() => setIsWorkoutLogOpen(false)}
					onSaved={(workoutLog) => {
						setIsWorkoutLogOpen(false);
						setTodayWorkoutLog(workoutLog);
						setSuccessMessage("Today's workout was logged.");
					}}
				/>
			) : null}

			<DashboardCard className="flex min-h-125 flex-col gap-7 p-8 xl:col-span-8">
				<div className="grid gap-5">
					<div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
						<div>
							<p className="mb-3 text-xs font-black uppercase tracking-widest text-primary">
								Today&apos;s plan
							</p>
							<h1 className="m-0 text-[clamp(1.8rem,3vw,2.6rem)] font-black uppercase leading-[1.08]">
								{isWorkoutDay
									? formatPlanLabel(todaySession?.session_type)
									: "Rest day"}
							</h1>
							<p className="mt-3 text-xl font-black uppercase tracking-[0.08em] text-muted">
								{todaySession?.day || todayName}
							</p>
						</div>
						<div className="grid justify-items-start gap-2 md:justify-items-end">
							<button
								type="button"
								onClick={handleSyncToPlan}
								disabled={
									isSyncingPlan || !loggedWorkout || hasSyncedAfterTodayWorkout
								}
								className="rounded-xl border border-primary bg-white px-5 py-3 text-sm font-black uppercase text-primary transition hover:bg-primary-soft disabled:cursor-not-allowed disabled:opacity-60"
							>
								{isSyncingPlan ? "Syncing..." : "Sync to plan"}
							</button>
							{!loggedWorkout || hasSyncedAfterTodayWorkout ? (
								<p className="m-0 max-w-64 text-left text-xs font-bold leading-4 text-muted md:text-right">
									{hasSyncedAfterTodayWorkout
										? "Today's workout is already synced."
										: "Available after today's workout is logged."}
								</p>
							) : null}
						</div>
					</div>

					{syncErrorMessage ? (
						<p className="rounded-xl border border-accent-coral bg-surface-soft p-3 text-sm font-black text-accent-coral">
							{syncErrorMessage}
						</p>
					) : null}

					{!loggedWorkout ? (
						<div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_12rem]">
							<div className="flex items-start gap-3 rounded-xl border border-border bg-surface-soft p-4 text-secondary">
								<span className="mt-0.5 grid h-9 w-9 flex-none place-items-center rounded-lg bg-primary-soft text-primary">
									<DumbbellIcon />
								</span>
								<div>
									<p className="m-0 text-xs font-black uppercase tracking-widest text-muted">
										{isWorkoutDay ? "Equipment" : "Recovery focus"}
									</p>
									<p className="mt-1 text-lg font-black leading-5">
										{isWorkoutDay ? primaryEquipment : "Rest, steps, mobility"}
									</p>
								</div>
							</div>
							<div className="flex items-center gap-3 rounded-xl border border-border bg-surface-soft p-4">
								<span className="grid h-10 w-10 flex-none place-items-center rounded-lg bg-primary-soft text-primary">
									<ClockIcon />
								</span>
								<div>
									<p className="m-0 text-xs font-black uppercase tracking-widest text-muted">
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
					) : null}
				</div>

				{isWorkoutDay && todaySession ? (
					<>
						{successMessage ? (
							<p className="rounded-xl border border-control bg-surface-soft p-3 text-sm font-black text-primary">
								{successMessage}
							</p>
						) : null}
						{!loggedWorkout ? (
							<div className="grid gap-3">
								<p className="m-0 text-xs font-black uppercase tracking-widest text-muted">
									Exercises
								</p>
								<div className="grid gap-3">
									{todaySession.exercises.map((exercise, index) => (
										<ExerciseDemoTrigger
											key={`${exercise.exercise_name}-${index}`}
											exercise={exercise}
											className="flex w-full cursor-pointer items-center justify-between gap-4 rounded-xl bg-primary-strong p-4 text-left text-white transition hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
										>
											<div className="min-w-0">
												<strong className="block text-base font-black leading-5">
													{exercise.exercise_name}
												</strong>
												<p className="mt-1 text-sm font-semibold text-primary-muted">
													{exercise.target_muscle_group}
												</p>
											</div>
											<div className="flex flex-none flex-col items-end gap-1">
												<p className="m-0 text-sm font-black text-primary-muted">
													{exercise.sets} sets x {exercise.reps}
												</p>
												<p className="m-0 max-w-36 text-right text-[0.68rem] font-black uppercase tracking-widest text-primary-muted">
													{exercise.exerciseDbId
														? "View demo"
														: "No demo, search"}
												</p>
											</div>
										</ExerciseDemoTrigger>
									))}
								</div>
							</div>
						) : null}

						{loggedWorkout ? (
							<LoggedWorkoutInfo workoutLog={loggedWorkout} />
						) : (
							<button
								type="button"
								onClick={() => {
									setSuccessMessage(null);
									setIsWorkoutLogOpen(true);
								}}
								className="mt-auto self-start rounded-xl border-0 bg-primary px-7.5 py-4.5 text-lg font-black uppercase text-white"
							>
								Log workout
							</button>
						)}
					</>
				) : (
					<div className="grid gap-4">
						<div className="rounded-xl border border-border bg-surface-soft p-5">
							<p className="m-0 text-xs font-black uppercase tracking-widest text-muted">
								Rest guidance
							</p>
							<p className="mt-2 text-base leading-6 text-secondary">
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
									className="rounded-xl bg-primary-strong p-4 text-white"
								>
									<p className="m-0 text-xs font-black uppercase tracking-widest text-primary-muted">
										{label}
									</p>
									<p className="mt-2 text-lg font-black">{value}</p>
								</div>
							))}
						</div>
						{restDayMeal ? (
							<div className="rounded-xl border border-border bg-white p-5">
								<p className="m-0 text-xs font-black uppercase tracking-widest text-primary">
									Recovery meal
								</p>
								<p className="mt-2 text-base font-black text-secondary">
									{restDayMeal.meal_name}
								</p>
								<p className="mt-1 text-sm leading-5 text-muted">
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
						<span className="rounded-full bg-primary-soft px-2.75 py-2 text-xs font-black uppercase tracking-[0.08em] text-primary">
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
						barClassName="bg-accent-blue"
					/>
					<ProgressBar
						label="Carbs"
						value={`${plan.nutrients.macros.carbs_g}g`}
						widthPercent={macroWidth(plan.nutrients.macros.carbs_g, macroTotal)}
						barClassName="bg-accent-amber"
					/>
					<ProgressBar
						label="Fat"
						value={`${plan.nutrients.macros.fat_g}g`}
						widthPercent={macroWidth(plan.nutrients.macros.fat_g, macroTotal)}
						barClassName="bg-accent-coral"
					/>
				</div>

				{plan.nutrients.sample_meals[0] ? (
					<div className="mt-7 rounded-xl border border-border bg-surface-soft p-4">
						<p className="m-0 text-xs font-black uppercase tracking-widest text-muted">
							Recommended meal today
						</p>
						<p className="mt-2 text-base font-black text-secondary">
							{plan.nutrients.sample_meals[0].meal_name}
						</p>
						<p className="mt-1 text-sm leading-5 text-muted">
							{plan.nutrients.sample_meals[0].description}
						</p>
						<p className="mt-2 text-xs font-black uppercase tracking-widest text-primary">
							{plan.nutrients.sample_meals[0].estimated_calories} kcal
						</p>
					</div>
				) : null}
			</DashboardCard>
		</div>
	);
}
