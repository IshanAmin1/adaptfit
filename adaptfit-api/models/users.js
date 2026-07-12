import { DataTypes } from "sequelize";
import { sequelize } from "../datasource.js";

export const User = sequelize.define(
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
		onboarding_profile: {
			type: DataTypes.JSONB,
			allowNull: true,
		},
		onboarding_completed_at: {
			type: DataTypes.DATE,
			allowNull: true,
		},
	},
	{
		tableName: "users",
		createdAt: "created_at",
		updatedAt: "updated_at",
	},
);

export function serializeUser(user, billingStatus = null) {
	return {
		id: user.id,
		email: user.email,
		firstName: user.first_name,
		lastName: user.last_name,
		fullName: user.full_name,
		avatarUrl: user.avatar_url,
		hasActiveSubscription: Boolean(billingStatus?.hasActiveSubscription),
		subscription: billingStatus?.subscription || null,
		hasCompletedOnboarding: Boolean(user.onboarding_completed_at),
	};
}

export async function findUserById(id) {
	const user = await User.findByPk(id);
	return user?.toJSON() || null;
}

export async function upsertGoogleUser(profile) {
	const [user] = await User.upsert(
		{
			google_sub: profile.googleSub,
			email: profile.email,
			email_verified: profile.emailVerified,
			first_name: profile.firstName,
			last_name: profile.lastName,
			full_name: profile.fullName,
			avatar_url: profile.avatarUrl,
		},
		{
			// conflict targets the unique constraint on google_sub, so if a user with the same google_sub exists,
			// it will update that user instead of creating a new one
			conflictFields: ["google_sub"],
			returning: true, // return the updated or created user instance
		},
	);

	return user?.toJSON();
}

export async function saveOnboardingProfile(userId, profile) {
	const [updatedCount, updatedUsers] = await User.update(
		{
			onboarding_profile: profile,
			onboarding_completed_at: new Date(),
		},
		{
			where: { id: userId },
			returning: true,
		},
	);

	if (!updatedCount) {
		return null;
	}

	return updatedUsers?.[0]?.toJSON() || (await findUserById(userId));
}
