"use strict";

/** @type {import("sequelize-cli").Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.createTable("users", {
			id: {
				type: Sequelize.UUID,
				primaryKey: true,
				allowNull: false,
				defaultValue: Sequelize.UUIDV4,
			},
			google_sub: {
				type: Sequelize.TEXT,
				allowNull: false,
				unique: true,
			},
			email: {
				type: Sequelize.TEXT,
				allowNull: false,
				unique: true,
			},
			email_verified: {
				type: Sequelize.BOOLEAN,
				allowNull: false,
				defaultValue: false,
			},
			first_name: {
				type: Sequelize.TEXT,
				allowNull: true,
			},
			last_name: {
				type: Sequelize.TEXT,
				allowNull: true,
			},
			full_name: {
				type: Sequelize.TEXT,
				allowNull: true,
			},
			avatar_url: {
				type: Sequelize.TEXT,
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
		await queryInterface.dropTable("users");
	},
};
