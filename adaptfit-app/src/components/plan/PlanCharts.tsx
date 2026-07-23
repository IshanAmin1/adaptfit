import type {
	GeneratedPlan,
	PlanExercise,
	PlanScheduleDay,
} from "../../types/plan";

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
		{ label: "Protein", value: protein, color: "#2567b8" },
		{ label: "Carbs", value: carbs, color: "#d99b22" },
		{ label: "Fat", value: fat, color: "#f46f5e" },
	];
	const total = data.reduce((sum, item) => sum + item.value, 0);
	let cursor = -Math.PI / 2;

	return (
		<div className="grid gap-4 rounded-lg border border-[#d9e5df] bg-[#f6faf7] p-4 md:grid-cols-[10rem_1fr] md:items-center">
			<svg
				viewBox="0 0 160 160"
				role="img"
				aria-label="Macro distribution"
				className="h-40 w-40"
			>
				<circle
					cx="80"
					cy="80"
					r="56"
					className="fill-none stroke-[#d9e5df] stroke-[18]"
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
					className="fill-[#17211f] text-[24px] font-black"
				>
					{total}g
				</text>
				<text
					x="80"
					y="95"
					textAnchor="middle"
					className="fill-[#62706b] text-[11px] font-black uppercase"
				>
					macros
				</text>
			</svg>
			<div className="grid gap-3">
				{data.map((item) => (
					<div key={item.label} className="grid gap-1">
						<div className="flex items-center justify-between gap-3 text-sm">
							<span className="flex items-center gap-2 font-black text-[#17211f]">
								<span
									className="h-3 w-3 rounded-full"
									style={{ backgroundColor: item.color }}
								/>
								{item.label}
							</span>
							<span className="font-semibold text-[#62706b]">
								{item.value}g - {getPercent(item.value, total)}%
							</span>
						</div>
						<div className="h-2 overflow-hidden rounded-full bg-[#e3ece7]">
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
		{ label: "BMI", value: plan.targets.bmi ?? 0, color: "#2567b8" },
		{ label: "BMR", value: Math.round(plan.targets.bmr), color: "#0f8b6f" },
		{ label: "TDEE", value: Math.round(plan.targets.tdee), color: "#d99b22" },
		{
			label: "Calories",
			value: plan.nutrients.daily_calories,
			color: "#f46f5e",
		},
	];
	const maxValue = Math.max(...values.map((item) => item.value), 1);

	return (
		<div className="grid gap-4 rounded-lg border border-[#d9e5df] bg-[#f6faf7] p-4">
			{values.map((item) => (
				<div
					key={item.label}
					className="grid grid-cols-[5rem_1fr_4.5rem] items-center gap-3"
				>
					<span className="text-xs font-black uppercase tracking-[0.08em] text-[#62706b]">
						{item.label}
					</span>
					<div className="h-4 overflow-hidden rounded-full bg-[#e3ece7]">
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
					<strong className="text-right text-sm text-[#17211f]">
						{item.label === "BMI" && item.value
							? item.value.toFixed(1)
							: item.value || "Pending"}
					</strong>
				</div>
			))}
		</div>
	);
}

export function WeeklyScheduleChart({
	schedule,
}: {
	schedule: PlanScheduleDay[];
}) {
	const weeklyMinutes = schedule.reduce(
		(total, session) => total + session.duration_minutes,
		0,
	);
	const weeklyExercises = schedule.reduce(
		(total, session) => total + session.exercises.length,
		0,
	);
	const weeklySets = schedule.reduce(
		(total, session) =>
			total +
			session.exercises.reduce(
				(sessionTotal, exercise) => sessionTotal + exercise.sets,
				0,
			),
		0,
	);
	const projection = [0, 1, 2, 3, 4, 5].map((week) => ({
		week: week + 1,
		workload: Math.round(weeklySets * (1 + week * 0.04)),
		minutes: Math.round(weeklyMinutes * (1 + week * 0.025)),
	}));
	const maxWorkload = Math.max(...projection.map((item) => item.workload), 1);
	const points = projection
		.map((item, index) => {
			const x = 24 + index * 50;
			const y = 120 - (item.workload / maxWorkload) * 88;
			return `${x},${y}`;
		})
		.join(" ");
	const areaPoints = `${points} 274,136 24,136`;

	return (
		<div className="grid gap-5 rounded-lg border border-[#d9e5df] bg-[#f6faf7] p-4 lg:grid-cols-[1.3fr_0.7fr]">
			<div>
				<svg
					viewBox="0 0 300 150"
					role="img"
					aria-label="Projected adaptation trend over six weeks"
					className="h-56 w-full"
				>
					<line x1="24" y1="32" x2="274" y2="32" className="stroke-[#d9e5df]" />
					<line x1="24" y1="84" x2="274" y2="84" className="stroke-[#d9e5df]" />
					<line
						x1="24"
						y1="136"
						x2="274"
						y2="136"
						className="stroke-[#d9e5df]"
					/>
					<polyline
						points={areaPoints}
						className="fill-[rgba(15,139,111,0.14)]"
					/>
					<polyline
						points={points}
						className="fill-none stroke-[#0f8b6f] stroke-[5] [stroke-linecap:round] [stroke-linejoin:round]"
					/>
					{projection.map((item, index) => {
						const x = 24 + index * 50;
						const y = 120 - (item.workload / maxWorkload) * 88;

						return (
							<g key={item.week}>
								<circle cx={x} cy={y} r="5" className="fill-[#2567b8]" />
								<text
									x={x}
									y="148"
									textAnchor="middle"
									className="fill-[#62706b] text-[10px] font-black"
								>
									W{item.week}
								</text>
							</g>
						);
					})}
				</svg>
				<div className="mt-2 flex flex-wrap gap-3 text-xs font-black uppercase tracking-[0.08em] text-[#62706b]">
					<span>Projected from current plan</span>
					<span>Updates with workout logs later</span>
				</div>
			</div>
			<div className="grid content-center gap-3">
				<div className="rounded-lg bg-white p-4">
					<p className="m-0 text-xs font-black uppercase tracking-widest text-[#62706b]">
						Current week
					</p>
					<p className="mt-2 text-2xl font-black text-[#17211f]">
						{weeklySets} sets
					</p>
				</div>
				<div className="grid grid-cols-2 gap-3">
					<div className="rounded-lg bg-white p-4">
						<p className="m-0 text-xs font-black uppercase tracking-widest text-[#62706b]">
							Minutes
						</p>
						<p className="mt-2 text-lg font-black text-[#17211f]">
							{weeklyMinutes}
						</p>
					</div>
					<div className="rounded-lg bg-white p-4">
						<p className="m-0 text-xs font-black uppercase tracking-widest text-[#62706b]">
							Exercises
						</p>
						<p className="mt-2 text-lg font-black text-[#17211f]">
							{weeklyExercises}
						</p>
					</div>
				</div>
				<div className="rounded-lg bg-white p-4">
					<p className="m-0 text-xs font-black uppercase tracking-widest text-[#62706b]">
						Week 6 projection
					</p>
					<p className="mt-2 text-lg font-black text-[#0f8b6f]">
						{projection[projection.length - 1].workload} sets
					</p>
				</div>
			</div>
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
			color: ["#0f8b6f", "#2567b8", "#d99b22", "#f46f5e", "#6b7280"][index % 5],
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
		<div className="grid gap-4 rounded-lg border border-[#d9e5df] bg-[#f6faf7] p-4">
			{data.map((item) => (
				<div key={item.label} className="grid gap-1">
					<div className="flex items-center justify-between gap-3 text-sm">
						<span className="font-black text-[#17211f]">{item.label}</span>
						<span className="font-semibold text-[#62706b]">
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
