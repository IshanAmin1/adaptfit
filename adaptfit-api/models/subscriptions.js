import { DataTypes } from "sequelize";
import { sequelize } from "../datasource.js";

const SubscriptionModel = sequelize.define(
	"Subscription",
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
		stripe_customer_id: {
			type: DataTypes.TEXT,
			allowNull: false,
		},
		stripe_subscription_id: {
			type: DataTypes.TEXT,
			allowNull: true,
			unique: true,
		},
		stripe_checkout_session_id: {
			type: DataTypes.TEXT,
			allowNull: true,
			unique: true,
		},
		stripe_price_id: {
			type: DataTypes.TEXT,
			allowNull: true,
		},
		stripe_product_id: {
			type: DataTypes.TEXT,
			allowNull: true,
		},
		status: {
			type: DataTypes.TEXT,
			allowNull: false,
			defaultValue: "checkout_pending",
		},
		current_period_start: {
			type: DataTypes.DATE,
			allowNull: true,
		},
		current_period_end: {
			type: DataTypes.DATE,
			allowNull: true,
		},
		cancel_at_period_end: {
			type: DataTypes.BOOLEAN,
			allowNull: false,
			defaultValue: false,
		},
		cancel_at: {
			type: DataTypes.DATE,
			allowNull: true,
		},
		canceled_at: {
			type: DataTypes.DATE,
			allowNull: true,
		},
		ended_at: {
			type: DataTypes.DATE,
			allowNull: true,
		},
	},
	{
		tableName: "subscriptions",
		createdAt: "created_at",
		updatedAt: "updated_at",
	},
);

export { SubscriptionModel, SubscriptionModel as Subscription };
