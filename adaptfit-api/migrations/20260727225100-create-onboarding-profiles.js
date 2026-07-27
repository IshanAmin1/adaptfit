"use strict";

/** @type {import("sequelize-cli").Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.createTable("onboarding_profiles", {
			id: {
				type: Sequelize.UUID,
				primaryKey: true,
				allowNull: false,
				defaultValue: Sequelize.UUIDV4,
			},
			user_id: {
				type: Sequelize.UUID,
				allowNull: false,
				unique: true,
				references: {
					model: "users",
					key: "id",
				},
			},
			age: {
				type: Sequelize.INTEGER,
				allowNull: false,
			},
			biological_sex: {
				type: Sequelize.TEXT,
				allowNull: false,
			},
			height_cm: {
				type: Sequelize.INTEGER,
				allowNull: false,
			},
			current_weight_kg: {
				type: Sequelize.INTEGER,
				allowNull: false,
			},
			primary_goal: {
				type: Sequelize.TEXT,
				allowNull: false,
			},
			target_goal: {
				type: Sequelize.TEXT,
				allowNull: true,
			},
			experience_level: {
				type: Sequelize.TEXT,
				allowNull: false,
			},
			injuries_or_limitations: {
				type: Sequelize.TEXT,
				allowNull: true,
			},
			training_location: {
				type: Sequelize.TEXT,
				allowNull: false,
			},
			equipment_available: {
				type: Sequelize.ARRAY(Sequelize.TEXT),
				allowNull: false,
				defaultValue: [],
			},
			machine_types: {
				type: Sequelize.ARRAY(Sequelize.TEXT),
				allowNull: false,
				defaultValue: [],
			},
			custom_machines: {
				type: Sequelize.TEXT,
				allowNull: true,
			},
			available_days: {
				type: Sequelize.ARRAY(Sequelize.TEXT),
				allowNull: false,
				defaultValue: [],
			},
			days_per_week: {
				type: Sequelize.INTEGER,
				allowNull: false,
			},
			preferred_session_length: {
				type: Sequelize.TEXT,
				allowNull: false,
			},
			diet_type: {
				type: Sequelize.TEXT,
				allowNull: false,
			},
			allergies_or_foods_to_avoid: {
				type: Sequelize.TEXT,
				allowNull: true,
			},
			meal_frequency_preference: {
				type: Sequelize.TEXT,
				allowNull: true,
			},
			profile: {
				type: Sequelize.JSONB,
				allowNull: true,
			},
			completed_at: {
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
		await queryInterface.dropTable("onboarding_profiles");
	},
};
