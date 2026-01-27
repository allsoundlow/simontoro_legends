# Database Guidelines

> Related PRD: #[[file:docs/PRD-infrastructure.md]] (Requirement 6: Data Persistence)

## Query Builder
- Use Kysely for type-safe SQL queries
- No ORM - write explicit queries
- Define database types that match your schema

## Migrations
- Use Kysely migrations for schema changes
- Migrations should be idempotent when possible
- Name migrations with timestamp prefix: `20260126_create_groups_table.ts`
- Always include both `up` and `down` functions

## Repository Pattern
```typescript
// repositories/group.repository.ts
export class GroupRepository {
  constructor(private db: Kysely<Database>) {}

  async findById(id: string): Promise<Group | null> {
    return this.db
      .selectFrom("groups")
      .where("id", "=", id)
      .selectAll()
      .executeTakeFirst() ?? null;
  }
}
```

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
