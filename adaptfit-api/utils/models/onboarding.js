import { OnboardingProfile } from "../../models/index.js";
import { findUserById } from "./users.js";

function optionalText(value) {
	return value ? String(value) : null;
}

function toInteger(value) {
	return Number.parseInt(value, 10);
}

function toTextArray(value) {
	return Array.isArray(value) ? value.map(String) : [];
}

function toOnboardingRecord(userId, profile) {
	const availableDays = toTextArray(profile.availableDays);

	return {
		user_id: userId,
		age: toInteger(profile.age),
		biological_sex: profile.biologicalSex,
		height_cm: toInteger(profile.height),
		current_weight_kg: toInteger(profile.currentWeight),
		primary_goal: profile.primaryGoal,
		target_goal: optionalText(profile.targetWeightOrTimeline),
		experience_level: profile.experienceLevel,
		injuries_or_limitations: optionalText(profile.injuriesOrLimitations),
		training_location: profile.trainingLocation,
		equipment_available: toTextArray(profile.equipmentAvailable),
		machine_types: toTextArray(profile.machineTypes),
		custom_machines: optionalText(profile.customMachines),
		available_days: availableDays,
		days_per_week: availableDays.length,
		preferred_session_length: profile.preferredSessionLength,
		diet_type: profile.dietType,
		allergies_or_foods_to_avoid: optionalText(profile.allergiesOrFoodsToAvoid),
		meal_frequency_preference: optionalText(profile.mealFrequencyPreference),
		profile,
		completed_at: new Date(),
	};
}

export async function saveOnboardingProfile(userId, profile) {
	await OnboardingProfile.upsert(toOnboardingRecord(userId, profile), {
		conflictFields: ["user_id"],
		returning: true,
	});

	return findUserById(userId);
}
