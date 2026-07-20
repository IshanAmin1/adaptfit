import { OnboardingProfileModel } from "./onboarding.js";
import { SubscriptionModel } from "./subscriptions.js";
import { UserModel } from "./users.js";

UserModel.hasOne(OnboardingProfileModel, {
	foreignKey: "user_id",
	as: "onboardingProfile",
});

UserModel.hasMany(SubscriptionModel, {
	foreignKey: "user_id",
	as: "subscriptions",
});

OnboardingProfileModel.belongsTo(UserModel, {
	foreignKey: "user_id",
	as: "user",
});

SubscriptionModel.belongsTo(UserModel, {
	foreignKey: "user_id",
	as: "user",
});

export {
	UserModel as User,
	OnboardingProfileModel as OnboardingProfile,
	SubscriptionModel as Subscription,
};
