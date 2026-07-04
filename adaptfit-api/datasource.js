import "dotenv/config";
import { Sequelize } from "sequelize";

if (!process.env.DATABASE_URL) {
  console.warn(
    "DATABASE_URL is not set. Database calls will fail until it is configured.",
  );
}

export const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: "postgres",
  logging: false,
});
