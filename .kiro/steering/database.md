# Database Guidelines

> Related PRD: #[[file:docs/PRD-infrastructure.md]] (Requirement 6: Data Persistence)

## Storage Architecture
See #[[file:.kiro/steering/repositories.md]] for the full storage adapter pattern.

- **StorageAdapter**: Generic interface for data operations
- **Connections**: Handle database connection setup (return pg Pool for PostgreSQL)
- **Repositories**: Business queries using storage adapters
- **PostgresAdapter**: Uses Kysely internally for type-safe SQL queries

## Query Builder
- Use Kysely for type-safe SQL queries (via PostgresAdapter)
- No ORM - write explicit queries
- Define database types that match your schema

## Migrations
- Use Kysely migrations for schema changes
- Migrations should be idempotent when possible
- Name migrations with timestamp prefix: `20260126_create_groups_table.ts`
- Always include both `up` and `down` functions

## Repository Pattern
Repositories use StorageAdapter for data access:

```typescript
// repositories/keyword.repository.ts
export class KeywordRepository {
  constructor(private storage: StorageAdapter<Keyword>) {}

  async findById(pk: number): Promise<Keyword | null> {
    return this.storage.get(pk);
  }

  async findByGroupId(groupId: number): Promise<ListResult<Keyword>> {
    return this.storage.getAllByFields({group_id: groupId});
  }
}
```

For full repository patterns, see #[[file:.kiro/steering/repositories.md]].

## Transactions
- Use Kysely transactions for multi-step operations
- Keep transactions short to avoid locks
- Handle rollback on errors

## Naming Conventions
- Tables: snake_case, plural (e.g., `groups`, `custom_commands`)
- Columns: snake_case (e.g., `created_at`, `group_id`)
- Foreign keys: `<table>_id` (e.g., `group_id`)
- Indexes: `idx_<table>_<columns>`

## Data Types
- Use auto-incrementing integers (`serial` / `bigserial`) for primary keys
- Use `timestamptz` for timestamps
- Use `jsonb` for flexible structured data
- Use enums sparingly - prefer string columns with app-level validation
