import type {PgConfig} from "../../config";
import {createMemoryConnection, type MemoryConnection} from "./memory.connection";
import {createPostgresConnection, type PostgresConnection} from "./postgres.connection";

export type {MemoryConnection} from "./memory.connection";
export type {KyselyDb, PostgresConnection} from "./postgres.connection";

export type Connection = MemoryConnection | PostgresConnection;

export type StorageConfig = {
  pg?: PgConfig;
};

export function createConnection(config: StorageConfig): Connection {
  if (config.pg) {
    return createPostgresConnection(config.pg);
  }
  return createMemoryConnection();
}

export async function closeConnection(connection: Connection): Promise<void> {
  if (connection.type === "postgres") {
    await connection.pool.end();
  }
  // Memory connection has nothing to close
}
