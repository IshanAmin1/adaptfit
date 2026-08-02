import { REDO_COOLDOWN_MS } from "../config/env";
import type { GeneratedPlan } from "../types/plan";

export function getRedoAvailableAt(completedAt?: string | null) {
	if (!completedAt) {
		return null;
	}

	return new Date(completedAt).getTime() + REDO_COOLDOWN_MS;
}

export function isRedoCooldownActive(
	completedAt?: string | null,
	now = Date.now(),
) {
	const redoAvailableAt = getRedoAvailableAt(completedAt);

	return redoAvailableAt ? now < redoAvailableAt : false;
}

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

	const uniqueEquipment = Array.from(new Set(equipment));

	return uniqueEquipment
		.map((item) => item.replace(/_/g, " "))
		.map((item) => (item === "bodyweight" ? "body weight" : item))
		.map((item) => item.charAt(0).toUpperCase() + item.slice(1))
		.join(", ");
}

export function formatPlanLabel(value: string | null | undefined) {
	if (!value) {
		return "Not provided";
	}

	return value
		.replace(/_/g, " ")
		.split(" ")
		.filter(Boolean)
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");
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
