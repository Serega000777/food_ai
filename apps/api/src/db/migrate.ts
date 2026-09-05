import { migrate } from "drizzle-orm/postgres-js/migrator";

import { createDatabase } from "./client";

async function main() {
  // Unlike the Nest app (ConfigModule.envFilePath), this standalone script has nothing
  // to load .env for it. Node's built-in loader (stable since 20.6) does that — no
  // dotenv dependency needed. CI sets DATABASE_URL directly, so a missing .env there
  // is expected, not an error.
  try {
    process.loadEnvFile("../../.env");
  } catch {
    // no .env file — fine when the environment already has DATABASE_URL (CI, Docker).
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required");

  const db = createDatabase(databaseUrl);
  await migrate(db, { migrationsFolder: "../../infrastructure/migrations" });
  console.log("Migrations applied.");
  process.exit(0);
}

void main();
