import { DataTypes } from "sequelize";
import { sequelize } from "../datasource.js";

const UserModel = sequelize.define(
	"User",
	{
		id: {
			type: DataTypes.UUID,
			primaryKey: true,
			defaultValue: DataTypes.UUIDV4,
		},
		google_sub: {
			type: DataTypes.TEXT,
			allowNull: false,
			unique: true,
		},
		email: {
			type: DataTypes.TEXT,
			allowNull: false,
			unique: true,
		},
		email_verified: {
			type: DataTypes.BOOLEAN,
			allowNull: false,
			defaultValue: false,
		},
		first_name: {
			type: DataTypes.TEXT,
			allowNull: true,
		},
		last_name: {
			type: DataTypes.TEXT,
			allowNull: true,
		},
		full_name: {
			type: DataTypes.TEXT,
			allowNull: true,
		},
		avatar_url: {
			type: DataTypes.TEXT,
			allowNull: true,
		},
	},
	{
		tableName: "users",
		createdAt: "created_at",
		updatedAt: "updated_at",
	},
);

export { UserModel, UserModel as User };
