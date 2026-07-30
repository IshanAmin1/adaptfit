import type { GeneratedPlan } from "../types/plan";

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

	return (
		plan.schedule.find(
			(session) => session.day.toLowerCase() === todayName.toLowerCase(),
		) || null
	);
}

export function formatEquipment(equipment: string[]) {
	if (!equipment.length) {
		return "None";
	}

	const formattedEquipment = [];

	for (const item of new Set(equipment)) {
		const label =
			item === "bodyweight" ? "body weight" : item.replace(/_/g, " ");
		formattedEquipment.push(label.charAt(0).toUpperCase() + label.slice(1));
	}

	return formattedEquipment.join(", ");
}

export function formatPlanLabel(value: string | null | undefined) {
	if (!value) {
		return "Not provided";
	}

	const words = value.replace(/_/g, " ").split(" ");
	const formattedWords = [];

	for (const word of words) {
		if (word) {
			formattedWords.push(word.charAt(0).toUpperCase() + word.slice(1));
		}
	}

	return formattedWords.join(" ");
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
