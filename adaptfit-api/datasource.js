import "dotenv/config";
import { Sequelize } from "sequelize";
import { DATABASE_URL } from "./config/env/storage.js";

export const sequelize = new Sequelize(DATABASE_URL, {
	dialect: "postgres",
	logging: false,
});
