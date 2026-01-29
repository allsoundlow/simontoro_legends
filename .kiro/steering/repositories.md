---
inclusion: always
---

# Repository & Storage Adapter Pattern

Two-layer data access: **StorageAdapter** (generic CRUD) → **Repository** (domain logic).

## Architecture

```
pkg/bot/
├── storage/
│   ├── adapter.ts                  # StorageAdapter<T> interface
│   ├── adapters/
│   │   ├── in-memory.adapter.ts    # Testing/dev
│   │   └── postgres.adapter.ts     # Production (Kysely)
│   ├── connections/                # Connection setup/teardown
│   └── index.ts                    # createAdapter() factory
└── repositories/
    └── *.repository.ts             # Domain-specific queries
```

## Core Types

```typescript
// All entities must have numeric pk
type Entity = { pk: number };

// Filter excludes pk and timestamps
type FieldFilter<T> = Partial<Omit<T, "pk" | "created_at" | "updated_at">>;

// Pagination
type ListQuery = { limit?: number; offset?: number };
type ListResult<T> = { data: T[]; pagination: Pagination };
```

## StorageAdapter Interface

| Method | Returns | Notes |
|--------|---------|-------|
| `get(pk)` | `T \| null` | By primary key |
| `getOneByFields(fields)` | `T \| null` | First match |
| `getAllByFields(fields, query?)` | `ListResult<T>` | Paginated |
| `insert(data)` | `number` | Returns pk |
| `update(pk, data)` | `number \| null` | null if not found |
| `remove(pk)` | `boolean` | Success flag |
| `count(fields)` | `number` | Match count |

## Repository Pattern

Repositories wrap StorageAdapter with domain-specific methods:

```typescript
export class KeywordRepository {
  constructor(private storage: StorageAdapter<Keyword>) {}

  // Domain methods - NOT generic wrappers
  async findByGroupId(groupId: number, query?: ListQuery): Promise<ListResult<Keyword>> {
    return this.storage.getAllByFields({group_id: groupId}, query);
  }

  async create(groupId: number, data: CreateKeywordRequest): Promise<number> {
    return this.storage.insert({
      group_id: groupId,
      pattern: data.pattern,
      pattern_type: data.pattern_type ?? "exact",      // Apply business defaults
      case_sensitive: data.case_sensitive ?? false,
      cooldown_seconds: data.cooldown_seconds ?? 0,
      // created_at/updated_at handled by database
    });
  }

  async update(pk: number, data: UpdateKeywordRequest): Promise<number | null> {
    if (Object.keys(data).length === 0) return pk;
    return this.storage.update(pk, data);  // updated_at handled by database trigger
  }
}
```

## Key Rules

1. **Database handles timestamps** - `created_at`/`updated_at` set by PostgreSQL defaults/triggers, not repository code
2. **Repositories apply business defaults** - Non-timestamp defaults go in `create()` method
3. **Domain-specific naming** - Use `findByGroupId()` not `findOneBy(fields)`
4. **Constructor injection** - Pass `StorageAdapter<T>` via constructor
5. **No storage backend knowledge** - Repository works with any adapter

## Connection & Adapter Creation

```typescript
// Config-driven: pg present → postgres, otherwise → memory
const connection = createConnection(config);
const adapter = createAdapter<Keyword, "keywords">(connection, "keywords");
const repo = new KeywordRepository(adapter);

// Cleanup
await closeConnection(connection);
```

## Testing

```typescript
// In-memory for tests (no pg config)
const connection = createConnection({});
const adapter = createAdapter<Keyword, "keywords">(connection, "keywords");
const repo = new KeywordRepository(adapter);
```

## Adding New Entities

1. Define Zod schema in `schemas/`
2. Create `*Repository` class in `repositories/`
3. Wire up in composition root with `createAdapter<Entity, "table_name">()`

No new adapter code needed - reuse existing implementations.
