import fs from "node:fs/promises";
import path from "node:path";

import {Pool} from "pg";

import type {PgConfig} from "../config";

const MIGRATIONS_TABLE = "schema_migrations";

type MigrationRecord = {
  pk: number;
  id: string;
  applied_at: Date;
};

/**
 * Ensures the migrations tracking table exists
 */
async function ensureMigrationsTable(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      pk          SERIAL PRIMARY KEY,
      id          VARCHAR(36) NOT NULL UNIQUE,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

/**
 * Gets list of already applied migration IDs
 */
async function getAppliedMigrations(pool: Pool): Promise<Set<string>> {
  const result = await pool.query<MigrationRecord>(`SELECT id FROM ${MIGRATIONS_TABLE} ORDER BY pk`);
  return new Set(result.rows.map((row) => row.id));
}

/**
 * Extracts migration ID from filename
 * Expected format: YYYYMMDDNNN_description.sql (e.g., 20260129001_initial_schema.sql)
 * Returns the numeric prefix as string migration ID
 */
function extractMigrationId(filename: string): string | null {
  const match = filename.match(/^(\d+)_.*\.sql$/);
  if (!match) return null;
  return match[1];
}

/**
 * Discovers all migration files in the migrations directory
 */
async function discoverMigrations(migrationsDir: string): Promise<Array<{id: string; filename: string}>> {
  const files = await fs.readdir(migrationsDir);
  const migrations: Array<{id: string; filename: string}> = [];

  for (const filename of files) {
    if (!filename.endsWith(".sql")) continue;
    const id = extractMigrationId(filename);
    if (id !== null) {
      migrations.push({id, filename});
    }
  }

  // Sort by ID to ensure correct execution order
  return migrations.sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Runs all pending migrations
 */
export async function runMigrations(config: PgConfig, migrationsDir: string): Promise<void> {
  const pool = new Pool({
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    password: config.password,
  });

  try {
    await ensureMigrationsTable(pool);
    const applied = await getAppliedMigrations(pool);
    const migrations = await discoverMigrations(migrationsDir);

    const pending = migrations.filter((m) => !applied.has(m.id));

    if (pending.length === 0) {
      console.log("No pending migrations");
      return;
    }

    console.log(`Found ${pending.length} pending migration(s)`);

    for (const migration of pending) {
      console.log(`Running migration ${migration.id}: ${migration.filename}`);

      const sqlPath = path.join(migrationsDir, migration.filename);
      const sql = await fs.readFile(sqlPath, "utf-8");

      // Run migration in a transaction
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(sql);
        await client.query(`INSERT INTO ${MIGRATIONS_TABLE} (id) VALUES ($1)`, [migration.id]);
        await client.query("COMMIT");
        console.log(`  ✓ Migration ${migration.id} applied successfully`);
      } catch (err) {
        await client.query("ROLLBACK");
        console.error(`  ✗ Migration ${migration.id} failed:`, err);
        throw err;
      } finally {
        client.release();
      }
    }

    console.log("All migrations completed");
  } finally {
    await pool.end();
  }
}

/**
 * Shows migration status
 */
export async function migrationStatus(config: PgConfig, migrationsDir: string): Promise<void> {
  const pool = new Pool({
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    password: config.password,
  });

  try {
    await ensureMigrationsTable(pool);
    const applied = await getAppliedMigrations(pool);
    const migrations = await discoverMigrations(migrationsDir);

    console.log("Migration Status:");
    console.log("-".repeat(60));

    for (const migration of migrations) {
      const status = applied.has(migration.id) ? "✓ applied" : "○ pending";
      console.log(`  ${status}  ${migration.id} - ${migration.filename}`);
    }

    const pendingCount = migrations.filter((m) => !applied.has(m.id)).length;
    console.log("-".repeat(60));
    console.log(`Total: ${migrations.length} migrations, ${pendingCount} pending`);
  } finally {
    await pool.end();
  }
}
