import { DataTypes } from "sequelize";
import { sequelize } from "../datasource.js";
import { User, findUserById } from "./users.js";

export const OnboardingProfile = sequelize.define(
	"OnboardingProfile",
	{
		id: {
			type: DataTypes.UUID,
			primaryKey: true,
			defaultValue: DataTypes.UUIDV4,
		},
		user_id: {
			type: DataTypes.UUID,
			allowNull: false,
			unique: true,
			references: {
				model: User,
				key: "id",
			},
		},
		age: {
			type: DataTypes.INTEGER,
			allowNull: false,
		},
		biological_sex: {
			type: DataTypes.TEXT,
			allowNull: false,
		},
		height_cm: {
			type: DataTypes.INTEGER,
			allowNull: false,
		},
		current_weight_kg: {
			type: DataTypes.INTEGER,
			allowNull: false,
		},
		primary_goal: {
			type: DataTypes.TEXT,
			allowNull: false,
		},
		target_goal: {
			type: DataTypes.TEXT,
			allowNull: true,
		},
		experience_level: {
			type: DataTypes.TEXT,
			allowNull: false,
		},
		injuries_or_limitations: {
			type: DataTypes.TEXT,
			allowNull: true,
		},
		training_location: {
			type: DataTypes.TEXT,
			allowNull: false,
		},
		equipment_available: {
			type: DataTypes.ARRAY(DataTypes.TEXT),
			allowNull: false,
			defaultValue: [],
		},
		machine_types: {
			type: DataTypes.ARRAY(DataTypes.TEXT),
			allowNull: false,
			defaultValue: [],
		},
		custom_machines: {
			type: DataTypes.TEXT,
			allowNull: true,
		},
		days_per_week: {
			type: DataTypes.INTEGER,
			allowNull: false,
		},
		preferred_session_length: {
			type: DataTypes.TEXT,
			allowNull: false,
		},
		diet_type: {
			type: DataTypes.TEXT,
			allowNull: false,
		},
		allergies_or_foods_to_avoid: {
			type: DataTypes.TEXT,
			allowNull: true,
		},
		meal_frequency_preference: {
			type: DataTypes.TEXT,
			allowNull: true,
		},
		profile: {
			type: DataTypes.JSONB,
			allowNull: true,
		},
		completed_at: {
			type: DataTypes.DATE,
			allowNull: false,
			defaultValue: DataTypes.NOW,
		},
	},
	{
		tableName: "onboarding_profiles",
		createdAt: "created_at",
		updatedAt: "updated_at",
	},
);

User.hasOne(OnboardingProfile, {
	foreignKey: "user_id",
	as: "onboardingProfile",
});

OnboardingProfile.belongsTo(User, {
	foreignKey: "user_id",
	as: "user",
});

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
		days_per_week: toInteger(profile.daysPerWeek),
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
