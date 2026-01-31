import type {Entity, StorageAdapter} from "./adapter";
import {InMemoryAdapter} from "./adapters/in-memory.adapter";
import {PostgresAdapter} from "./adapters/postgres.adapter";
import type {Connection} from "./connections";

/**
 * Factory function to create a storage adapter from a connection.
 *
 * @param connection - The connection to use (memory or postgres)
 * @param table - The table name (used by PostgresAdapter)
 * @returns A StorageAdapter instance appropriate for the connection type
 */
export function createAdapter<T extends Entity>(
  connection: Connection,
  table: string,
): StorageAdapter<T> {
  switch (connection.type) {
    case "memory":
      return new InMemoryAdapter<T>();
    case "postgres":
      return new PostgresAdapter<T>(connection.db, table);
  }
}

// Re-export types from adapter
export type {Entity, FieldFilter, ListQuery, ListResult, StorageAdapter} from "./adapter";

// Re-export types and functions from connections
export type {Connection, KyselyDb, MemoryConnection, PostgresConnection, StorageConfig} from "./connections";
export {closeConnection, createConnection} from "./connections";
