import { readFile } from "node:fs/promises";
import path from "node:path";
import nextEnv from "@next/env";
import postgres from "postgres";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required.");

const sql = postgres(connectionString, {
  max: 1,
  prepare: false,
  ssl: process.env.DATABASE_SSL === "false" ? false : "require",
});

try {
  const migration = await readFile(
    path.join(process.cwd(), "db/migrations/001_initial.sql"),
    "utf8",
  );
  await sql.unsafe(migration);
  console.log("Database migration complete.");
} finally {
  await sql.end();
}
