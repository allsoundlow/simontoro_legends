import {Pool} from "pg";

import type {PgConfig} from "../../config";

export type PostgresConnection = {
  type: "postgres";
  pool: Pool;
};

export function createPostgresConnection(config: PgConfig): PostgresConnection {
  const pool = new Pool({
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    password: config.password,
  });

  return {type: "postgres", pool};
}
