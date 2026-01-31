import {Kysely, PostgresDialect} from "kysely";
import {Pool} from "pg";

import type {PgConfig} from "../../config";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type KyselyDb = Kysely<any>;

export type PostgresConnection = {
  type: "postgres";
  pool: Pool;
  db: KyselyDb;
};

export function createPostgresConnection(config: PgConfig): PostgresConnection {
  const pool = new Pool({
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    password: config.password,
  });

  const db = new Kysely({
    dialect: new PostgresDialect({pool}),
  });

  return {type: "postgres", pool, db};
}
