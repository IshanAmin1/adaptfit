"use strict";

/** @type {import("sequelize-cli").Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.createTable("workout_logs", {
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
			plan_id: {
				type: Sequelize.UUID,
				allowNull: false,
				references: {
					model: "plans",
					key: "id",
				},
			},
			day: {
				type: Sequelize.TEXT,
				allowNull: false,
			},
			session_type: {
				type: Sequelize.TEXT,
				allowNull: false,
			},
			exercises: {
				type: Sequelize.JSONB,
				allowNull: false,
				defaultValue: [],
			},
			notes: {
				type: Sequelize.TEXT,
				allowNull: true,
			},
			logged_for: {
				type: Sequelize.DATEONLY,
				allowNull: false,
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
		await queryInterface.dropTable("workout_logs");
	},
};
