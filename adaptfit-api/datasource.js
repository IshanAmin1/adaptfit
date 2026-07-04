import "dotenv/config";
import { Sequelize } from "sequelize";

export const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not configured.");
}

export const sequelize = new Sequelize(databaseUrl, {
  dialect: "postgres",
  logging: false,
});
