import type { GeneratedPlan, PlanScheduleDay } from "../types/plan";

const weekdays = [
	"Sunday",
	"Monday",
	"Tuesday",
	"Wednesday",
	"Thursday",
	"Friday",
	"Saturday",
];

export function getTodayName(date = new Date()) {
	return weekdays[date.getDay()];
}

export function findTodaySession(plan: GeneratedPlan | null) {
	if (!plan?.schedule.length) {
		return null;
	}

	const todayName = getTodayName();
	const todaySession = plan.schedule.find(
		(session) => session.day.toLowerCase() === todayName.toLowerCase(),
	);

	return (
		todaySession ||
		plan.schedule.find((session) => session.exercises.length) ||
		plan.schedule[0]
	);
}

export function getTotalExerciseCount(schedule: PlanScheduleDay[]) {
	return schedule.reduce(
		(total, session) => total + session.exercises.length,
		0,
	);
}

export function formatEquipment(equipment: string[]) {
	if (!equipment.length) {
		return "None";
	}

	return equipment
		.map((item) => item.replaceAll("_", " "))
		.map((item) => item.charAt(0).toUpperCase() + item.slice(1))
		.join(", ");
}

export function formatGeneratedDate(value?: string) {
	if (!value) {
		return "Recently generated";
	}

	return new Intl.DateTimeFormat(undefined, {
		month: "short",
		day: "numeric",
		year: "numeric",
	}).format(new Date(value));
}
