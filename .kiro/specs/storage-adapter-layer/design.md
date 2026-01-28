# Design Document: Storage Adapter Layer

## Overview

This design implements a two-layer data access pattern that separates low-level storage operations from business queries. The pattern enables repositories to work with any storage backend without code changes, following the architecture described in `.kiro/steering/repositories.md`.

The key insight is that storage operations (CRUD) are generic across all entities, while business queries are entity-specific. By separating these concerns:
- **StorageAdapter** handles generic CRUD operations for any entity type
- **Repository** handles entity-specific business queries using a StorageAdapter

This design allows:
- Easy testing with in-memory storage
- Production use with PostgreSQL via Kysely
- Future support for other backends (MySQL, MongoDB) without changing repositories

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Application Layer                         │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    Services (Business Logic)                 ││
│  │  KeywordService, GroupService, etc.                         ││
│  └─────────────────────────────────────────────────────────────┘│
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    Repositories (Business Queries)           ││
│  │  KeywordRepository, GroupRepository, etc.                   ││
│  │  - Domain-specific query methods                            ││
│  │  - Timestamp handling                                       ││
│  │  - Default value application                                ││
│  └─────────────────────────────────────────────────────────────┘│
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    Storage Layer                             ││
│  │  ┌─────────────────────────────────────────────────────────┐││
│  │  │              StorageAdapter<T> Interface                │││
│  │  │  get, getOneByFields, getAllByFields, insert,          │││
│  │  │  update, remove, count                                  │││
│  │  └─────────────────────────────────────────────────────────┘││
│  │                    │                     │                   ││
│  │                    ▼                     ▼                   ││
│  │  ┌──────────────────────┐  ┌──────────────────────┐        ││
│  │  │   InMemoryAdapter    │  │   PostgresAdapter    │        ││
│  │  │   (Map<number, T>)   │  │   (pg Pool + Kysely) │        ││
│  │  └──────────────────────┘  └──────────────────────┘        ││
│  └─────────────────────────────────────────────────────────────┘│
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    Connections                               ││
│  │  ┌──────────────────────┐  ┌──────────────────────┐        ││
│  │  │  MemoryConnection    │  │  PostgresConnection  │        ││
│  │  │  {type: "memory"}    │  │  {type: "postgres",  │        ││
│  │  │                      │  │   pool: Pool}        │        ││
│  │  └──────────────────────┘  └──────────────────────┘        ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### File Structure

```
pkg/bot/
├── storage/
│   ├── adapter.ts              # StorageAdapter interface + types
│   ├── adapters/
│   │   ├── in-memory.adapter.ts    # In-memory implementation
│   │   └── postgres.adapter.ts     # PostgreSQL implementation (uses Kysely internally)
│   ├── connections/
│   │   ├── index.ts                # Connection types + factory
│   │   ├── memory.connection.ts    # Memory connection creator
│   │   └── postgres.connection.ts  # PostgreSQL connection creator (returns pg Pool)
│   └── index.ts                # Public exports + createAdapter factory
├── repositories/
│   └── keyword.repository.ts   # Refactored to use StorageAdapter
└── config/
    └── index.ts                # Updated with storage config schema
```

### StorageAdapter Interface

The core abstraction for all storage operations:

```typescript
// storage/adapter.ts
import type {Pagination} from "../schemas/common/pagination";

// Base entity type - all entities must have numeric pk (primary key)
export type Entity = {
  pk: number;
};

// Field filter - partial entity fields for querying (excludes pk and timestamps)
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
  get(pk: number): Promise<T | null>;
  getOneByFields(fields: FieldFilter<T>): Promise<T | null>;
  getAllByFields(fields: FieldFilter<T>, query?: ListQuery): Promise<ListResult<T>>;
  insert(data: Omit<T, "pk">): Promise<number>;  // Returns the pk of inserted entity
  update(pk: number, data: Partial<Omit<T, "pk">>): Promise<number | null>;  // Returns pk or null if not found
  remove(pk: number): Promise<boolean>;
  count(fields: FieldFilter<T>): Promise<number>;
};
```

### InMemoryAdapter

Implementation using JavaScript Map for testing:

```typescript
// storage/adapters/in-memory.adapter.ts
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

### PostgresAdapter

Implementation using Kysely for PostgreSQL (Kysely is encapsulated internally):

```typescript
// storage/adapters/postgres.adapter.ts
import {Kysely, PostgresDialect} from "kysely";
import type {Pool} from "pg";

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

### Connection Types and Factory

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

```typescript
// storage/connections/memory.connection.ts
export function createMemoryConnection(): MemoryConnection {
  return {type: "memory"};
}
```

```typescript
// storage/connections/postgres.connection.ts
import {Pool} from "pg";

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

```typescript
// storage/connections/index.ts (connection factory)
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

### Storage Factory

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
```

### Refactored KeywordRepository

```typescript
// repositories/keyword.repository.ts
import type {FieldFilter, ListQuery, ListResult, StorageAdapter} from "../storage/adapter";
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

  async findOneBy(fields: FieldFilter<Keyword>): Promise<Keyword | null> {
    return this.storage.getOneByFields(fields);
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

## Data Models

### Entity Base Type

All storable entities must extend this base type:

```typescript
type Entity = {
  pk: number;
};
```

### Keyword Entity

The existing Keyword type from `schemas/keyword.ts` (note: `id` field will be renamed to `pk`):

```typescript
type Keyword = {
  pk: number;
  group_id: number;
  pattern: string;
  pattern_type: "exact" | "phrase" | "wildcard";
  case_sensitive: boolean;
  cooldown_seconds: number;
  created_at: string;  // ISO 8601 datetime
  updated_at: string;  // ISO 8601 datetime
};
```

### Storage Configuration

Added to the app config schema using optional config objects (no discriminated union):

```typescript
// PostgreSQL config schema
const pgConfigSchema = z.object({
  host: z.string(),
  port: z.number().int().positive(),
  database: z.string(),
  user: z.string(),
  password: z.string(),
});

// App config with optional database configs
const configSchema = z.object({
  // ... other config fields
  pg: pgConfigSchema.optional(),  // If present, use PostgresAdapter
  // mysql: mysqlConfigSchema.optional(),  // Future: MySQL support
  // mongodb: mongoConfigSchema.optional(), // Future: MongoDB support
});

// If no database config is present, InMemoryAdapter is used
```

### Connection Types

```typescript
type MemoryConnection = {
  type: "memory";
};

type PostgresConnection = {
  type: "postgres";
  pool: Pool;
};

type Connection = MemoryConnection | PostgresConnection;

// Config uses optional database objects (no discriminated union)
type PgConfig = {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
};

type StorageConfig = {
  pg?: PgConfig;
  // mysql?: MysqlConfig;  // Future
};
```

### Query Types

```typescript
type FieldFilter<T> = Partial<Omit<T, "pk" | "created_at" | "updated_at">>;

type ListQuery = {
  limit?: number;
  offset?: number;
};

type ListResult<T> = {
  data: T[];
  pagination: Pagination;
};
```



## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Based on the prework analysis, the following properties have been identified. Properties are consolidated to avoid redundancy—adapter-specific behaviors (InMemoryAdapter, KyselyAdapter) are tested through the same properties since they implement the same interface.

### Property 1: Insert-then-get round trip

*For any* valid entity data (without pk), inserting it into the adapter and then calling `get()` with the returned pk SHALL return an entity equivalent to the inserted data (with the assigned pk).

**Validates: Requirements 2.4, 2.7, 3.3, 3.6**

### Property 2: Sequential PK generation

*For any* sequence of N insert operations on a fresh InMemoryAdapter, the assigned PKs SHALL be 1, 2, 3, ..., N in order.

**Validates: Requirements 2.3**

### Property 3: Field filtering correctness

*For any* set of entities and any field filter, `getAllByFields(filter)` SHALL return only entities where every specified field matches, and `count(filter)` SHALL equal the length of the returned data when no pagination is applied.

**Validates: Requirements 2.5, 2.6, 2.10, 3.4, 3.5, 3.9**

### Property 4: Update preserves unmodified fields

*For any* existing entity and any partial update data, calling `update(id, data)` SHALL return an entity where:
- All fields in `data` are updated to the new values
- All fields NOT in `data` retain their original values

**Validates: Requirements 2.8, 3.7**

### Property 5: Remove makes entity unretrievable

*For any* existing entity, calling `remove(pk)` SHALL return true, and subsequent `get(pk)` SHALL return null. For any non-existent pk, `remove(pk)` SHALL return false.

**Validates: Requirements 2.9, 3.8**

### Property 6: Repository create applies defaults and timestamps

*For any* valid CreateKeywordRequest, calling `repository.create(groupId, data)` SHALL return a Keyword where:
- `pattern_type` defaults to "exact" if not specified
- `case_sensitive` defaults to false if not specified
- `cooldown_seconds` defaults to 0 if not specified
- `created_at` and `updated_at` are valid ISO 8601 timestamps
- `group_id` matches the provided groupId

**Validates: Requirements 6.6**

### Property 7: Repository update sets updated_at

*For any* existing keyword and any valid UpdateKeywordRequest, calling `repository.update(id, data)` SHALL return a Keyword where `updated_at` is a valid ISO 8601 timestamp that is greater than or equal to the original `updated_at`.

**Validates: Requirements 6.7**

## Error Handling

### StorageAdapter Error Handling

The StorageAdapter interface uses return values rather than exceptions for expected cases:

| Operation | Not Found Behavior | Error Behavior |
|-----------|-------------------|----------------|
| `get(pk)` | Returns `null` | Throws on database error |
| `getOneByFields(fields)` | Returns `null` | Throws on database error |
| `getAllByFields(fields, query)` | Returns empty `data` array | Throws on database error |
| `insert(data)` | N/A | Throws on database error or constraint violation |
| `update(pk, data)` | Returns `null` | Throws on database error |
| `remove(pk)` | Returns `false` | Throws on database error |
| `count(fields)` | Returns `0` | Throws on database error |

### Connection Error Handling

- `createPostgresConnection()` may throw if the pg Pool cannot be created
- `closeConnection()` may throw if the pool fails to close gracefully
- Connection errors should be caught at the application startup level and logged

### Repository Error Handling

Repositories delegate to StorageAdapter and do not add additional error handling. The service layer is responsible for interpreting null returns as "not found" errors.

### Configuration Error Handling

- Invalid storage configuration will cause Zod validation to throw at startup
- Missing required fields (for postgres config) will be caught by Zod schema validation

## Testing Strategy

### Dual Testing Approach

This feature uses both unit tests and property-based tests:

- **Unit tests**: Verify specific examples, edge cases, and integration points
- **Property tests**: Verify universal properties across randomly generated inputs

### Property-Based Testing Configuration

- **Library**: fast-check (TypeScript property-based testing library)
- **Minimum iterations**: 100 per property test
- **Tag format**: `Feature: storage-adapter-layer, Property N: [property description]`

### Test Structure

```
pkg/bot/tests/
├── storage/
│   ├── in-memory.adapter.test.ts    # Property tests for InMemoryAdapter
│   └── adapter.properties.test.ts   # Shared property tests (adapter-agnostic)
└── repositories/
    └── keyword.repository.test.ts   # Property tests for KeywordRepository
```

### Unit Test Coverage

| Component | Test Focus |
|-----------|------------|
| InMemoryAdapter | Basic CRUD operations, edge cases (empty filter, large datasets) |
| PostgresAdapter | Integration tests with PostgreSQL (optional, requires Docker) |
| Connection factory | Memory connection creation, close behavior |
| KeywordRepository | Delegation to adapter, timestamp handling, default application |
| Config schema | Valid/invalid config parsing, default values |

### Property Test Coverage

Each correctness property maps to a property-based test:

| Property | Test File | Generator |
|----------|-----------|-----------|
| P1: Insert-then-get | adapter.properties.test.ts | Random entity data |
| P2: Sequential PKs | in-memory.adapter.test.ts | Sequence of random entities |
| P3: Field filtering | adapter.properties.test.ts | Random entities + random filters |
| P4: Update preserves | adapter.properties.test.ts | Random entity + random partial update |
| P5: Remove behavior | adapter.properties.test.ts | Random entity |
| P6: Create defaults | keyword.repository.test.ts | Random CreateKeywordRequest |
| P7: Update timestamp | keyword.repository.test.ts | Random keyword + random update |

### Integration Testing

PostgresAdapter integration tests are optional and require:
1. Docker Compose running PostgreSQL
2. Test database with keywords table created
3. `CONFIG_PATH` pointing to postgres config

These tests verify that PostgresAdapter produces correct SQL and handles PostgreSQL-specific behaviors.
