#!/usr/bin/env tsx
/**
 * Migration CLI
 *
 * Usage:
 *   yarn migrate           # Run all pending migrations
 *   yarn migrate:status    # Show migration status
 *
 * Requires CONFIG_PATH environment variable or local.config.json with pg config
 */

import path from "node:path";

import loadConfig from "../config.loader";
import {migrationStatus, runMigrations} from "./runner";

async function main() {
  const appPath = process.cwd();
  const config = loadConfig({appPath});
  const migrationsDir = path.join(appPath, "migrations");

  if (!config.pg) {
    console.error("PostgreSQL configuration required for migrations");
    console.error("Ensure your config file has a 'pg' section with host, port, database, user, password");
    process.exit(1);
  }

  const command = process.argv[2] || "up";

  switch (command) {
    case "up":
      await runMigrations(config.pg, migrationsDir);
      break;
    case "status":
      await migrationStatus(config.pg, migrationsDir);
      break;
    default:
      console.error(`Unknown command: ${command}`);
      console.error("Usage: yarn migrate [up|status]");
      process.exit(1);
  }
}

main().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
