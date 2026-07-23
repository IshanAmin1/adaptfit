import { DataTypes } from "sequelize";
import { sequelize } from "../datasource.js";

const PlanModel = sequelize.define(
	"Plan",
	{
		id: {
			type: DataTypes.UUID,
			primaryKey: true,
			defaultValue: DataTypes.UUIDV4,
		},
		user_id: {
			type: DataTypes.UUID,
			allowNull: false,
			references: {
				model: "users",
				key: "id",
			},
		},
		onboarding_profile_id: {
			type: DataTypes.UUID,
			allowNull: true,
			references: {
				model: "onboarding_profiles",
				key: "id",
			},
		},
		status: {
			type: DataTypes.TEXT,
			allowNull: false,
			defaultValue: "generated",
		},
		metadata: {
			type: DataTypes.JSONB,
			allowNull: false,
		},
		targets: {
			type: DataTypes.JSONB,
			allowNull: false,
		},
		nutrients: {
			type: DataTypes.JSONB,
			allowNull: false,
		},
		schedule: {
			type: DataTypes.JSONB,
			allowNull: false,
		},
		exercises: {
			type: DataTypes.JSONB,
			allowNull: false,
			defaultValue: [],
		},
		adaptive_notes: {
			type: DataTypes.JSONB,
			allowNull: false,
		},
		generated_at: {
			type: DataTypes.DATE,
			allowNull: false,
			defaultValue: DataTypes.NOW,
		},
	},
	{
		tableName: "plans",
		createdAt: "created_at",
		updatedAt: "updated_at",
	},
);

export { PlanModel, PlanModel as Plan };
