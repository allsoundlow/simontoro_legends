# Repository Pattern Guidelines

> Related PRD: #[[file:docs/PRD-architecture.md]] (Layered Architecture), #[[file:docs/PRD-infrastructure.md]] (Requirement 6: Data Persistence)

## Overview

This project uses a two-layer data access pattern:

1. **StorageAdapter** - Low-level abstraction over data sources (in-memory, PostgreSQL, MySQL, etc.)
2. **Repository** - Business queries and domain logic, works with any StorageAdapter

This separation means you write one repository class that works with any storage backend.

## File Structure
```
pkg/bot/
├── storage/
│   ├── adapter.ts              # StorageAdapter interface + types
│   ├── adapters/
│   │   ├── in-memory.adapter.ts    # In-memory implementation
│   │   └── postgres.adapter.ts     # PostgreSQL implementation (uses Kysely internally)
│   ├── connections/
│   │   ├── index.ts                # Connection factory
│   │   ├── memory.connection.ts    # In-memory connection
│   │   └── postgres.connection.ts  # PostgreSQL connection (returns pg Pool)
│   └── index.ts                # Exports + createAdapter factory
└── repositories/
    ├── keyword.repository.ts   # KeywordRepository class
    ├── group.repository.ts     # GroupRepository class
    └── user.repository.ts      # UserRepository class
```

## Storage Adapter

### Interface Definition

```typescript
// storage/adapter.ts
import type {Pagination} from "../schemas/common/pagination";

// Base entity type - all entities must have numeric pk (primary key)
export type Entity = {
  pk: number;
};

// Field filter - partial entity fields for querying
export type FieldFilter<T> = Partial<Omit<T, "pk" | "created_at" | "updated_at">>;

// Query options for list operations
export type ListQuery = {
  limit?: number;
  offset?: number;
};

// List response with pagination
export type ListResult<T> = {
  data: T[];
  pagination: Pagination;
};

// Generic storage adapter interface
export type StorageAdapter<T extends Entity> = {
  // Get single entity by pk
  get(pk: number): Promise<T | null>;

  // Get single entity matching field values
  getOneByFields(fields: FieldFilter<T>): Promise<T | null>;

  // Get all entities matching field values with pagination
  getAllByFields(fields: FieldFilter<T>, query?: ListQuery): Promise<ListResult<T>>;

  // Insert new entity (pk is auto-generated), returns the pk
  insert(data: Omit<T, "pk">): Promise<number>;

  // Update entity by pk, returns pk or null if not found
  update(pk: number, data: Partial<Omit<T, "pk">>): Promise<number | null>;

  // Remove entity by pk
  remove(pk: number): Promise<boolean>;

  // Count entities matching field values
  count(fields: FieldFilter<T>): Promise<number>;
};
```

### In-Memory Implementation

```typescript
// storage/adapters/in-memory.adapter.ts
import type {Entity, FieldFilter, ListQuery, ListResult, StorageAdapter} from "../adapter";

export class InMemoryAdapter<T extends Entity> implements StorageAdapter<T> {
  private items: Map<number, T> = new Map();
  private nextPk = 1;

  async get(pk: number): Promise<T | null> {
    return this.items.get(pk) ?? null;
  }

  async getOneByFields(fields: FieldFilter<T>): Promise<T | null> {
    for (const item of this.items.values()) {
      if (this.matchesFields(item, fields)) {
        return item;
      }
    }
    return null;
  }

  async getAllByFields(fields: FieldFilter<T>, query: ListQuery = {}): Promise<ListResult<T>> {
    const {limit = 50, offset = 0} = query;
    const filtered = Array.from(this.items.values()).filter((item) =>
      this.matchesFields(item, fields),
    );
    return {
      data: filtered.slice(offset, offset + limit),
      pagination: {total: filtered.length, limit, offset},
    };
  }

  async insert(data: Omit<T, "pk">): Promise<number> {
    const item = {pk: this.nextPk++, ...data} as T;
    this.items.set(item.pk, item);
    return item.pk;
  }

  async update(pk: number, data: Partial<Omit<T, "pk">>): Promise<number | null> {
    const existing = this.items.get(pk);
    if (!existing) return null;
    const updated = {...existing, ...data} as T;
    this.items.set(pk, updated);
    return pk;
  }

  async remove(pk: number): Promise<boolean> {
    return this.items.delete(pk);
  }

  async count(fields: FieldFilter<T>): Promise<number> {
    let count = 0;
    for (const item of this.items.values()) {
      if (this.matchesFields(item, fields)) count++;
    }
    return count;
  }

  private matchesFields(item: T, fields: FieldFilter<T>): boolean {
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined && item[key as keyof T] !== value) {
        return false;
      }
    }
    return true;
  }
}
```

### PostgreSQL Implementation

```typescript
// storage/adapters/postgres.adapter.ts
import {Kysely, PostgresDialect} from "kysely";
import type {Pool} from "pg";

import type {Entity, FieldFilter, ListQuery, ListResult, StorageAdapter} from "../adapter";

export class PostgresAdapter<T extends Entity, TTable extends string>
  implements StorageAdapter<T>
{
  private db: Kysely<Record<TTable, T>>;

  constructor(
    pool: Pool,
    private table: TTable,
  ) {
    this.db = new Kysely<Record<TTable, T>>({
      dialect: new PostgresDialect({pool}),
    });
  }

  async get(pk: number): Promise<T | null> {
    const result = await this.db
      .selectFrom(this.table)
      .where("pk" as any, "=", pk)
      .selectAll()
      .executeTakeFirst();
    return (result as T) ?? null;
  }

  async getOneByFields(fields: FieldFilter<T>): Promise<T | null> {
    let query = this.db.selectFrom(this.table).selectAll();
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        query = query.where(key as any, "=", value);
      }
    }
    const result = await query.executeTakeFirst();
    return (result as T) ?? null;
  }

  async getAllByFields(fields: FieldFilter<T>, query: ListQuery = {}): Promise<ListResult<T>> {
    const {limit = 50, offset = 0} = query;

    let baseQuery = this.db.selectFrom(this.table);
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        baseQuery = baseQuery.where(key as any, "=", value);
      }
    }

    const [data, countResult] = await Promise.all([
      baseQuery.selectAll().limit(limit).offset(offset).execute(),
      baseQuery.select((eb) => eb.fn.countAll().as("count")).executeTakeFirst(),
    ]);

    return {
      data: data as T[],
      pagination: {total: Number(countResult?.count ?? 0), limit, offset},
    };
  }

  async insert(data: Omit<T, "pk">): Promise<number> {
    const result = await this.db
      .insertInto(this.table)
      .values(data as any)
      .returning("pk")
      .executeTakeFirstOrThrow();
    return result.pk as number;
  }

  async update(pk: number, data: Partial<Omit<T, "pk">>): Promise<number | null> {
    const result = await this.db
      .updateTable(this.table)
      .set(data as any)
      .where("pk" as any, "=", pk)
      .returning("pk")
      .executeTakeFirst();
    return (result?.pk as number | undefined) ?? null;
  }

  async remove(pk: number): Promise<boolean> {
    const result = await this.db
      .deleteFrom(this.table)
      .where("pk" as any, "=", pk)
      .executeTakeFirst();
    return result.numDeletedRows > 0n;
  }

  async count(fields: FieldFilter<T>): Promise<number> {
    let query = this.db.selectFrom(this.table);
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        query = query.where(key as any, "=", value);
      }
    }
    const result = await query.select((eb) => eb.fn.countAll().as("count")).executeTakeFirst();
    return Number(result?.count ?? 0);
  }
}
```

## Connections

Connections handle the setup and lifecycle of data source connections.

### Connection Interface

```typescript
// storage/connections/index.ts
import type {Pool} from "pg";

// Connection types
export type MemoryConnection = {
  type: "memory";
};

export type PostgresConnection = {
  type: "postgres";
  pool: Pool;
};

export type Connection = MemoryConnection | PostgresConnection;

// PostgreSQL config type (matches config.pg)
export type PgConfig = {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
};

// Storage config uses optional database configs
// If pg is present → use PostgresAdapter
// If no database config → use InMemoryAdapter
export type StorageConfig = {
  pg?: PgConfig;
  // mysql?: MysqlConfig;  // Future
  // mongodb?: MongoConfig; // Future
};
```

### Memory Connection

```typescript
// storage/connections/memory.connection.ts
import type {MemoryConnection} from "./index";

export function createMemoryConnection(): MemoryConnection {
  return {type: "memory"};
}
```

### PostgreSQL Connection

```typescript
// storage/connections/postgres.connection.ts
import {Pool} from "pg";

import type {PostgresConnection, PgConfig} from "./index";

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
```

### Connection Factory

```typescript
// storage/connections/index.ts (continued)
import {createMemoryConnection} from "./memory.connection";
import {createPostgresConnection} from "./postgres.connection";

// Create connection based on config - if pg is present, use postgres; otherwise memory
export function createConnection(config: StorageConfig): Connection {
  if (config.pg) {
    return createPostgresConnection(config.pg);
  }
  // No database config specified, use in-memory
  return createMemoryConnection();
}

export async function closeConnection(connection: Connection): Promise<void> {
  if (connection.type === "postgres") {
    await connection.pool.end();
  }
  // Memory connection has nothing to close
}
```

## Storage Factory

Creates adapters from a connection.

```typescript
// storage/index.ts
import type {Entity, StorageAdapter} from "./adapter";
import {InMemoryAdapter} from "./adapters/in-memory.adapter";
import {PostgresAdapter} from "./adapters/postgres.adapter";
import type {Connection} from "./connections";

export function createAdapter<T extends Entity, TTable extends string>(
  connection: Connection,
  table: TTable,
): StorageAdapter<T> {
  switch (connection.type) {
    case "memory":
      return new InMemoryAdapter<T>();
    case "postgres":
      return new PostgresAdapter<T, TTable>(connection.pool, table);
  }
}

// Re-export types
export type {StorageAdapter, Entity, FieldFilter, ListQuery, ListResult} from "./adapter";
export type {Connection, StorageConfig} from "./connections";
export {createConnection, closeConnection} from "./connections";
```

## Repository

Repositories contain business queries and domain logic. They work with the `StorageAdapter` abstraction, not specific implementations.

### Example: KeywordRepository

```typescript
// repositories/keyword.repository.ts
import type {StorageAdapter, FieldFilter, ListQuery, ListResult} from "../storage/adapter";
import type {CreateKeywordRequest, Keyword, UpdateKeywordRequest} from "../schemas/keyword";

export class KeywordRepository {
  constructor(private storage: StorageAdapter<Keyword>) {}

  async findById(pk: number): Promise<Keyword | null> {
    return this.storage.get(pk);
  }

  async findByGroupId(groupId: number, query?: ListQuery): Promise<ListResult<Keyword>> {
    return this.storage.getAllByFields({group_id: groupId}, query);
  }

  async findByPattern(groupId: number, pattern: string): Promise<Keyword | null> {
    return this.storage.getOneByFields({group_id: groupId, pattern});
  }

  async findAllBy(fields: FieldFilter<Keyword>, query?: ListQuery): Promise<ListResult<Keyword>> {
    return this.storage.getAllByFields(fields, query);
  }

  async create(groupId: number, data: CreateKeywordRequest): Promise<number> {
    const now = new Date().toISOString();
    return this.storage.insert({
      group_id: groupId,
      pattern: data.pattern,
      pattern_type: data.pattern_type ?? "exact",
      case_sensitive: data.case_sensitive ?? false,
      cooldown_seconds: data.cooldown_seconds ?? 0,
      created_at: now,
      updated_at: now,
    });
  }

  async update(pk: number, data: UpdateKeywordRequest): Promise<number | null> {
    if (Object.keys(data).length === 0) {
      return pk;
    }
    return this.storage.update(pk, {
      ...data,
      updated_at: new Date().toISOString(),
    });
  }

  async delete(pk: number): Promise<boolean> {
    return this.storage.remove(pk);
  }

  async countByGroup(groupId: number): Promise<number> {
    return this.storage.count({group_id: groupId});
  }
}
```

## Usage

### Application Bootstrap

```typescript
// app.ts or composition root
import {createConnection, createAdapter, closeConnection} from "./storage";
import {KeywordRepository} from "./repositories/keyword.repository";
import type {Keyword} from "./schemas/keyword";

// Create connection based on config
// If config.pg exists → postgres, otherwise → memory
const connection = createConnection(config);

// Create adapters for each entity
const keywordAdapter = createAdapter<Keyword, "keywords">(connection, "keywords");

// Create repositories
const keywordRepo = new KeywordRepository(keywordAdapter);

// On shutdown
await closeConnection(connection);
```

### In Tests
```typescript
import {createConnection, createAdapter} from "../storage";
import {KeywordRepository} from "../repositories/keyword.repository";

// No pg config = in-memory adapter
const connection = createConnection({});
const adapter = createAdapter<Keyword, "keywords">(connection, "keywords");
const repo = new KeywordRepository(adapter);
```

### In Production
```typescript
// With pg config = PostgreSQL adapter
const connection = createConnection({
  pg: {
    host: "localhost",
    port: 5432,
    database: "saimontoro",
    user: "bot",
    password: "secret",
  },
});
const adapter = createAdapter<Keyword, "keywords">(connection, "keywords");
const repo = new KeywordRepository(adapter);
```

### Config-Driven Storage Selection
```typescript
// config/index.ts
export const pgConfigSchema = z.object({
  host: z.string(),
  port: z.number().int().positive(),
  database: z.string(),
  user: z.string(),
  password: z.string(),
});

export const configSchema = z.object({
  // ... other fields
  pg: pgConfigSchema.optional(),  // If present, use PostgresAdapter
  // mysql: mysqlConfigSchema.optional(),  // Future
});

// Usage: if config.pg exists → postgres, otherwise → memory
```

## Key Principles

1. **StorageAdapter is generic** - One implementation works for any entity type
2. **Repository is entity-specific** - Contains business logic for that entity
3. **Repository doesn't know the storage backend** - Works with any adapter
4. **Timestamps handled in repository** - `created_at`, `updated_at` logic lives in repository
5. **Defaults applied in repository** - Schema defaults applied during `create()`
6. **Adapter is stateless** - Just translates operations to the data source

## Method Conventions

### StorageAdapter Methods
| Method | Purpose | Returns |
|--------|---------|---------|
| `get(pk)` | Fetch by primary key | `T \| null` |
| `getOneByFields(fields)` | Fetch first match by field values | `T \| null` |
| `getAllByFields(fields, query)` | Fetch all matches with pagination | `ListResult<T>` |
| `insert(data)` | Create new record | `number` (pk) |
| `update(pk, data)` | Partial update by pk | `number \| null` (pk or null if not found) |
| `remove(pk)` | Delete by pk | `boolean` |
| `count(fields)` | Count matching records | `number` |

### Repository Methods
Repositories expose domain-specific methods that make sense for the entity:

```typescript
// Good - domain-specific names
repo.findByGroupId(groupId)
repo.findByPattern(groupId, pattern)
repo.countByGroup(groupId)

// Avoid - generic names that just wrap adapter
repo.findOneBy(fields)  // Use adapter directly if needed
```

## Adding New Entities

1. Define Zod schema in `schemas/`
2. Create repository class in `repositories/`
3. Use existing adapter implementations - no new adapter code needed

```typescript
// repositories/group.repository.ts
export class GroupRepository {
  constructor(private storage: StorageAdapter<Group>) {}
  
  // Domain-specific methods...
}
```
