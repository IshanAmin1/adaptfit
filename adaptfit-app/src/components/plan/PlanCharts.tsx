import type { GeneratedPlan, PlanExercise } from "../../types/plan";

type MacroDonutProps = {
	protein: number;
	carbs: number;
	fat: number;
};

type ChartDatum = {
	label: string;
	value: number;
	color: string;
};

function getArcPath(
	cx: number,
	cy: number,
	radius: number,
	startAngle: number,
	endAngle: number,
) {
	const start = {
		x: cx + radius * Math.cos(startAngle),
		y: cy + radius * Math.sin(startAngle),
	};
	const end = {
		x: cx + radius * Math.cos(endAngle),
		y: cy + radius * Math.sin(endAngle),
	};
	const largeArcFlag = endAngle - startAngle > Math.PI ? 1 : 0;

	return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
}

function getPercent(value: number, total: number) {
	if (!total) {
		return 0;
	}

	return Math.round((value / total) * 100);
}

export function MacroDonut({ protein, carbs, fat }: MacroDonutProps) {
	const data: ChartDatum[] = [
		{ label: "Protein", value: protein, color: "var(--color-accent-blue)" },
		{ label: "Carbs", value: carbs, color: "var(--color-accent-amber)" },
		{ label: "Fat", value: fat, color: "var(--color-accent-coral)" },
	];
	const total = Math.round(data.reduce((sum, item) => sum + item.value, 0));
	let cursor = -Math.PI / 2;

	return (
		<div className="grid gap-4 rounded-xl border border-border bg-surface-soft p-4 md:grid-cols-[1fr_1fr] md:items-center">
			<svg viewBox="0 0 160 160" role="img" aria-label="Macro distribution">
				<circle
					cx="80"
					cy="80"
					r="56"
					className="fill-none stroke-border stroke-[18]"
				/>
				{data.map((item) => {
					const angle = total ? (item.value / total) * Math.PI * 2 : 0;
					if (angle <= 0) {
						return null;
					}

					if (angle >= Math.PI * 2) {
						return (
							<circle
								key={item.label}
								cx="80"
								cy="80"
								r="56"
								fill="none"
								stroke={item.color}
								strokeWidth="18"
							/>
						);
					}

					const path = getArcPath(80, 80, 56, cursor, cursor + angle);
					cursor += angle;

					return (
						<path
							key={item.label}
							d={path}
							fill="none"
							stroke={item.color}
							strokeWidth="18"
							strokeLinecap="round"
						/>
					);
				})}
				<text
					x="80"
					y="75"
					textAnchor="middle"
					className="fill-secondary text-[24px] font-black"
				>
					{total}g
				</text>
				<text
					x="80"
					y="95"
					textAnchor="middle"
					className="fill-muted text-[11px] font-black uppercase"
				>
					macros
				</text>
			</svg>
			<div className="grid gap-3">
				{data.map((item) => (
					<div key={item.label} className="grid gap-1">
						<div className="flex items-center justify-between gap-3 text-sm">
							<span className="flex items-center gap-2 font-black text-secondary">
								<span
									className="h-3 w-3 rounded-full"
									style={{ backgroundColor: item.color }}
								/>
								{item.label}
							</span>
							<span className="font-semibold text-muted">
								{item.value}g - {getPercent(item.value, total)}%
							</span>
						</div>
						<div className="h-2 overflow-hidden rounded-full bg-border-soft">
							<span
								className="block h-full rounded-[inherit]"
								style={{
									width: `${getPercent(item.value, total)}%`,
									backgroundColor: item.color,
								}}
							/>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

export function EnergyTargetsChart({ plan }: { plan: GeneratedPlan }) {
	const values = [
		{
			label: "BMI",
			value: plan.targets.bmi ?? 0,
			color: "var(--color-accent-blue)",
		},
		{
			label: "BMR",
			value: Math.round(plan.targets.bmr),
			color: "var(--color-primary)",
		},
		{
			label: "TDEE",
			value: Math.round(plan.targets.tdee),
			color: "var(--color-accent-amber)",
		},
		{
			label: "Calories",
			value: plan.nutrients.daily_calories,
			color: "var(--color-accent-coral)",
		},
	];
	const maxValue = Math.max(...values.map((item) => item.value), 1);

	return (
		<div className="grid gap-4 rounded-xl border border-border bg-surface-soft p-4">
			{values.map((item) => (
				<div
					key={item.label}
					className="grid grid-cols-[5rem_1fr_4.5rem] items-center gap-3"
				>
					<span className="text-xs font-black uppercase tracking-[0.08em] text-muted">
						{item.label}
					</span>
					<div className="h-4 overflow-hidden rounded-full bg-border-soft">
						<span
							className="block h-full rounded-[inherit]"
							style={{
								width: item.value
									? `${Math.max(8, Math.round((item.value / maxValue) * 100))}%`
									: "0%",
								backgroundColor: item.color,
							}}
						/>
					</div>
					<strong className="text-right text-sm text-secondary">
						{item.label === "BMI" && item.value
							? item.value.toFixed(1)
							: item.value || "Pending"}
					</strong>
				</div>
			))}
		</div>
	);
}

function getMuscleGroupData(exercises: PlanExercise[]) {
	const counts = exercises.reduce<Record<string, number>>(
		(result, exercise) => {
			const key = exercise.target_muscle_group || "Other";
			result[key] = (result[key] || 0) + 1;
			return result;
		},
		{},
	);

	return Object.entries(counts)
		.map(([label, value], index) => ({
			label,
			value,
			color: [
				"var(--color-primary)",
				"var(--color-accent-blue)",
				"var(--color-accent-amber)",
				"var(--color-accent-coral)",
				"var(--color-accent-neutral)",
			][index % 5],
		}))
		.sort((a, b) => b.value - a.value);
}

export function MuscleGroupChart({ exercises }: { exercises: PlanExercise[] }) {
	const data = getMuscleGroupData(exercises).slice(0, 5);
	const total = data.reduce((sum, item) => sum + item.value, 0);

	if (!data.length) {
		return null;
	}

	return (
		<div className="grid gap-4 rounded-xl border border-border bg-surface-soft p-4">
			{data.map((item) => (
				<div key={item.label} className="grid gap-1">
					<div className="flex items-center justify-between gap-3 text-sm">
						<span className="font-black text-secondary">{item.label}</span>
						<span className="font-semibold text-muted">
							{item.value} - {getPercent(item.value, total)}%
						</span>
					</div>
					<div className="h-3 overflow-hidden rounded-full bg-white">
						<span
							className="block h-full rounded-[inherit]"
							style={{
								width: `${getPercent(item.value, total)}%`,
								backgroundColor: item.color,
							}}
						/>
					</div>
				</div>
			))}
		</div>
	);
}
