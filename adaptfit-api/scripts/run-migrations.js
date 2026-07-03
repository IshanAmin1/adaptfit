import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "../datasource.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsPath = path.resolve(__dirname, "../migrations");

try {
  const migrationFiles = (await fs.readdir(migrationsPath))
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of migrationFiles) {
    const sql = await fs.readFile(path.join(migrationsPath, file), "utf8");
    await pool.query(sql);
    console.log("Applied migration:", file);
  }
} catch (error) {
  console.error("Migration failed:", error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
