import DashboardCard from "./common/DashboardCard";
import SectionHeading from "./common/SectionHeading";
import { EnergyTargetsChart } from "./plan/PlanCharts";
import PlanState from "./plan/PlanState";
import { useLatestPlan } from "../hooks/useLatestPlan";

export default function InsightsCard() {
	const { plan, isLoading, errorMessage } = useLatestPlan();

	if (isLoading) {
		return (
			<div className="mx-auto grid w-full max-w-336 grid-cols-1 gap-6 px-4 pb-12 pt-8 md:px-12 lg:grid-cols-12">
				<PlanState title="Loading insights" message="Reading your plan data." />
			</div>
		);
	}

	if (errorMessage) {
		return (
			<div className="mx-auto grid w-full max-w-336 grid-cols-1 gap-6 px-4 pb-12 pt-8 md:px-12 lg:grid-cols-12">
				<PlanState title="Insights unavailable" message={errorMessage} />
			</div>
		);
	}

	if (!plan) {
		return (
			<div className="mx-auto grid w-full max-w-336 grid-cols-1 gap-6 px-4 pb-12 pt-8 md:px-12 lg:grid-cols-12">
				<PlanState
					title="No insights yet"
					message="Generate a plan before reviewing insights."
				/>
			</div>
		);
	}

	const triggers = plan.adaptiveNotes.adjustment_triggers;
	const totalExercises = plan.schedule.reduce(
		(total, session) => total + session.exercises.length,
		0,
	);
	const totalMinutes = plan.schedule.reduce(
		(total, session) => total + session.duration_minutes,
		0,
	);
	const signalItems = [
		{
			label: "Training frequency",
			value: `${plan.schedule.length} days/week`,
			width: Math.min(100, Math.round((plan.schedule.length / 7) * 100)),
		},
		{
			label: "Exercise variety",
			value: `${totalExercises} movements`,
			width: Math.min(100, Math.round((totalExercises / 30) * 100)),
		},
		{
			label: "Weekly time",
			value: `${totalMinutes} min`,
			width: Math.min(100, Math.round((totalMinutes / 420) * 100)),
		},
	];

	return (
		<div className="mx-auto grid w-full max-w-336 grid-cols-1 gap-6 px-4 pb-12 pt-8 md:px-12 lg:grid-cols-12">
			<DashboardCard className="p-8 lg:col-span-7">
				<SectionHeading
					eyebrow="Insights"
					title="Plan calibration"
					action={
						<div className="grid h-12 w-12 place-items-center rounded-full bg-primary-soft font-black text-accent-blue">
							AI
						</div>
					}
				/>

				<div className="mt-6 grid gap-4">
					{triggers.length ? (
						triggers.map((trigger, index) => (
							<div
								key={`${trigger}-${index}`}
								className="rounded-xl border border-border bg-surface-soft p-4.5"
							>
								<strong className="block text-[17px] font-semibold">
									Adaptation rule {index + 1}
								</strong>
								<p className="mt-2 leading-6 text-muted">{trigger}</p>
							</div>
						))
					) : (
						<p className="rounded-xl border border-border bg-surface-soft p-4.5 text-muted">
							No adaptive rules were included in this plan.
						</p>
					)}
				</div>
			</DashboardCard>

			<DashboardCard className="p-8 lg:col-span-5">
				<SectionHeading eyebrow="Signals" title="Plan signals" />
				<div className="mt-6 grid gap-4">
					{signalItems.map((item) => (
						<div
							key={item.label}
							className="rounded-xl border border-border bg-surface-soft p-4"
						>
							<div className="flex items-center justify-between gap-3">
								<span className="text-sm font-black text-secondary">
									{item.label}
								</span>
								<span className="text-sm font-semibold text-muted">
									{item.value}
								</span>
							</div>
							<div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white">
								<span
									className="block h-full rounded-[inherit] bg-primary"
									style={{ width: `${item.width}%` }}
								/>
							</div>
						</div>
					))}
					<div className="rounded-xl border border-border bg-surface-soft p-4">
						<p className="m-0 text-xs font-black uppercase tracking-widest text-muted">
							Adaptation rules
						</p>
						<p className="mt-2 text-2xl font-black text-primary">
							{triggers.length}
						</p>
					</div>
				</div>
			</DashboardCard>

			<DashboardCard className="p-6 lg:col-span-12">
				<SectionHeading
					eyebrow="Calculations"
					title="Body and energy targets"
				/>
				<div className="mt-4">
					<EnergyTargetsChart plan={plan} />
				</div>
			</DashboardCard>
		</div>
	);
}
