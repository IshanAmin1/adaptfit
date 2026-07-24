import { DataTypes } from "sequelize";
import { sequelize } from "../datasource.js";

const OnboardingProfileModel = sequelize.define(
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
				model: "users",
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
		available_days: {
			type: DataTypes.ARRAY(DataTypes.TEXT),
			allowNull: false,
			defaultValue: [],
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

export { OnboardingProfileModel, OnboardingProfileModel as OnboardingProfile };
