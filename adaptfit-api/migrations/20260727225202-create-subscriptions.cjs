"use strict";

/** @type {import("sequelize-cli").Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.createTable("subscriptions", {
			id: {
				type: Sequelize.UUID,
				primaryKey: true,
				allowNull: false,
				defaultValue: Sequelize.UUIDV4,
			},
			user_id: {
				type: Sequelize.UUID,
				allowNull: false,
				references: {
					model: "users",
					key: "id",
				},
			},
			stripe_customer_id: {
				type: Sequelize.TEXT,
				allowNull: false,
			},
			stripe_subscription_id: {
				type: Sequelize.TEXT,
				allowNull: true,
				unique: true,
			},
			stripe_checkout_session_id: {
				type: Sequelize.TEXT,
				allowNull: true,
				unique: true,
			},
			stripe_price_id: {
				type: Sequelize.TEXT,
				allowNull: true,
			},
			stripe_product_id: {
				type: Sequelize.TEXT,
				allowNull: true,
			},
			status: {
				type: Sequelize.TEXT,
				allowNull: false,
				defaultValue: "checkout_pending",
			},
			current_period_start: {
				type: Sequelize.DATE,
				allowNull: true,
			},
			current_period_end: {
				type: Sequelize.DATE,
				allowNull: true,
			},
			cancel_at_period_end: {
				type: Sequelize.BOOLEAN,
				allowNull: false,
				defaultValue: false,
			},
			cancel_at: {
				type: Sequelize.DATE,
				allowNull: true,
			},
			canceled_at: {
				type: Sequelize.DATE,
				allowNull: true,
			},
			ended_at: {
				type: Sequelize.DATE,
				allowNull: true,
			},
			created_at: {
				type: Sequelize.DATE,
				allowNull: false,
			},
			updated_at: {
				type: Sequelize.DATE,
				allowNull: false,
			},
		});
	},

	async down(queryInterface) {
		await queryInterface.dropTable("subscriptions");
	},
};
