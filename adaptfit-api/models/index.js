import { OnboardingProfileModel } from "./onboarding.js";
import { PlanModel } from "./plans.js";
import { SubscriptionModel } from "./subscriptions.js";
import { UserModel } from "./users.js";
import { WorkoutLogModel } from "./workout_logs.js";

UserModel.hasOne(OnboardingProfileModel, {
	foreignKey: "user_id",
	as: "onboardingProfile",
});

UserModel.hasMany(SubscriptionModel, {
	foreignKey: "user_id",
	as: "subscriptions",
});

UserModel.hasMany(PlanModel, {
	foreignKey: "user_id",
	as: "plans",
});

UserModel.hasMany(WorkoutLogModel, {
	foreignKey: "user_id",
	as: "workoutLogs",
});

OnboardingProfileModel.belongsTo(UserModel, {
	foreignKey: "user_id",
	as: "user",
});

OnboardingProfileModel.hasMany(PlanModel, {
	foreignKey: "onboarding_profile_id",
	as: "plans",
});

SubscriptionModel.belongsTo(UserModel, {
	foreignKey: "user_id",
	as: "user",
});

PlanModel.belongsTo(UserModel, {
	foreignKey: "user_id",
	as: "user",
});

PlanModel.belongsTo(OnboardingProfileModel, {
	foreignKey: "onboarding_profile_id",
	as: "onboardingProfile",
});

PlanModel.hasMany(WorkoutLogModel, {
	foreignKey: "plan_id",
	as: "workoutLogs",
});

WorkoutLogModel.belongsTo(UserModel, {
	foreignKey: "user_id",
	as: "user",
});

WorkoutLogModel.belongsTo(PlanModel, {
	foreignKey: "plan_id",
	as: "plan",
});

export {
	UserModel as User,
	OnboardingProfileModel as OnboardingProfile,
	PlanModel as Plan,
	SubscriptionModel as Subscription,
	WorkoutLogModel as WorkoutLog,
};
