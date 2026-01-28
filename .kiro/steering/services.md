# Service Layer Guidelines

> Related PRD: #[[file:docs/PRD-architecture.md]] (Layered Architecture)

## Overview

Services contain business logic, validation rules, and orchestration. They sit between routes and repositories.

## Error Handling Pattern

Services throw errors for all failure cases. Routes catch these errors and convert them to appropriate HTTP responses.

```typescript
// Services return data directly, throw on failure
async getById(groupId: number, id: number): Promise<Entity> {
  const entity = await this.repo.findById(id);
  if (!entity || entity.group_id !== groupId) {
    throw new NotFoundError(`Entity ${id} not found`);
  }
  return entity;
}
```

### Error Classes
Use error classes from `errors/index.ts`:
- `NotFoundError` - Resource doesn't exist (404)
- `ConflictError` - Duplicate or conflicting state (409)
- `ValidationError` - Invalid input or business rule violation (400)

### When to Throw
- Resource not found
- Duplicate entry / conflict
- Business rule violations
- Repository returns null/false when operation should succeed

## Service Structure

```typescript
export class EntityService {
  constructor(private repo: EntityRepository) {}

  async create(groupId: number, data: CreateRequest): Promise<Entity> {
    // 1. Business validation (duplicates, limits, etc.)
    // 2. Repository operation
    // 3. Return created entity (throw on failure)
  }

  async getById(groupId: number, id: number): Promise<Entity> {
    // 1. Fetch from repo
    // 2. Verify ownership/access (throw NotFoundError if not)
    // 3. Return entity
  }

  async update(groupId: number, id: number, data: UpdateRequest): Promise<Entity> {
    // 1. Verify exists (throw if not)
    // 2. Business validation (throw ConflictError for duplicates)
    // 3. Update (throw if repo returns null)
    // 4. Return updated entity
  }

  async delete(groupId: number, id: number): Promise<void> {
    // 1. Verify exists (throw if not)
    // 2. Delete (throw if repo returns false)
  }
}
```

## Key Principles

- Services are platform-agnostic (no Telegram/Discord specifics)
- Receive dependencies via constructor injection
- Return domain objects directly, throw errors on failure
- Routes handle error-to-HTTP-response conversion
- Keep business logic in services, not routes or repositories
