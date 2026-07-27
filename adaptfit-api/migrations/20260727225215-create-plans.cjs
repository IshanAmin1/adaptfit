"use strict";

/** @type {import("sequelize-cli").Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.createTable("plans", {
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
			onboarding_profile_id: {
				type: Sequelize.UUID,
				allowNull: true,
				references: {
					model: "onboarding_profiles",
					key: "id",
				},
			},
			status: {
				type: Sequelize.TEXT,
				allowNull: false,
				defaultValue: "generated",
			},
			metadata: {
				type: Sequelize.JSONB,
				allowNull: false,
			},
			targets: {
				type: Sequelize.JSONB,
				allowNull: false,
			},
			nutrients: {
				type: Sequelize.JSONB,
				allowNull: false,
			},
			schedule: {
				type: Sequelize.JSONB,
				allowNull: false,
			},
			exercises: {
				type: Sequelize.JSONB,
				allowNull: false,
				defaultValue: [],
			},
			adaptive_notes: {
				type: Sequelize.JSONB,
				allowNull: false,
			},
			generated_at: {
				type: Sequelize.DATE,
				allowNull: false,
				defaultValue: Sequelize.NOW,
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
		await queryInterface.dropTable("plans");
	},
};
