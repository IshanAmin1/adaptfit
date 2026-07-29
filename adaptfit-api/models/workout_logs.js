import { DataTypes } from "sequelize";
import { sequelize } from "../datasource.js";

const WorkoutLogModel = sequelize.define(
	"WorkoutLog",
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
		plan_id: {
			type: DataTypes.UUID,
			allowNull: false,
			references: {
				model: "plans",
				key: "id",
			},
		},
		day: {
			type: DataTypes.TEXT,
			allowNull: false,
		},
		session_type: {
			type: DataTypes.TEXT,
			allowNull: false,
		},
		exercises: {
			type: DataTypes.JSONB,
			allowNull: false,
			defaultValue: [],
		},
		notes: {
			type: DataTypes.TEXT,
			allowNull: true,
		},
		logged_for: {
			type: DataTypes.DATEONLY,
			allowNull: false,
		},
	},
	{
		tableName: "workout_logs",
		createdAt: "created_at",
		updatedAt: "updated_at",
	},
);

export { WorkoutLogModel };
