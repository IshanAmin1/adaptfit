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
		profile: {
			type: DataTypes.JSONB,
			allowNull: false,
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

export async function saveOnboardingProfile(userId, profile) {
	const completedAt = new Date();

	await OnboardingProfile.upsert(
		{
			user_id: userId,
			profile,
			completed_at: completedAt,
		},
		{
			conflictFields: ["user_id"],
			returning: true,
		},
	);

	return findUserById(userId);
}
