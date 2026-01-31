import type {Admin, Group, Keyword} from "../entities";
import type {Connection, KyselyDb} from "../storage";
import type {StorageAdapter} from "../storage/adapter";
import {InMemoryAdapter} from "../storage/adapters/in-memory.adapter";
import {PostgresAdapter} from "../storage/adapters/postgres.adapter";
import {AdminRepository} from "./admin.repository";
import {GroupRepository} from "./group.repository";
import {KeywordRepository} from "./keyword.repository";

/**
 * Creates a storage adapter for the given entity and table.
 * Uses the transaction context if provided, otherwise uses the main db.
 */
function createAdapter<T extends {pk: number}>(
  connection: Connection,
  table: string,
  trx?: KyselyDb,
): StorageAdapter<T> {
  if (connection.type === "memory") {
    return new InMemoryAdapter<T>();
  }
  // Use transaction if available, otherwise main db
  const db = trx ?? connection.db;
  return new PostgresAdapter<T>(db, table);
}

/**
 * Repository registry that provides transaction-aware access to all repositories.
 * Repositories are created lazily and use the current transaction context.
 */
export class Repositories {
  private _admin?: AdminRepository;
  private _group?: GroupRepository;
  private _keyword?: KeywordRepository;

  constructor(
    private connection: Connection,
    private trx?: KyselyDb,
  ) {}

  /**
   * Creates a new Repositories instance bound to a transaction.
   * Use this in aroundExecute to pass transaction context.
   */
  withTransaction(trx: KyselyDb): Repositories {
    return new Repositories(this.connection, trx);
  }

  get admin(): AdminRepository {
    if (!this._admin) {
      this._admin = new AdminRepository(createAdapter<Admin>(this.connection, "administrators", this.trx));
    }
    return this._admin;
  }

  get group(): GroupRepository {
    if (!this._group) {
      this._group = new GroupRepository(createAdapter<Group>(this.connection, "groups", this.trx));
    }
    return this._group;
  }

  get keyword(): KeywordRepository {
    if (!this._keyword) {
      this._keyword = new KeywordRepository(
        createAdapter<Keyword>(this.connection, "keywords", this.trx),
      );
    }
    return this._keyword;
  }
}

/**
 * Creates a repository registry for the given connection.
 */
export function createRepositories(connection: Connection): Repositories {
  return new Repositories(connection);
}
