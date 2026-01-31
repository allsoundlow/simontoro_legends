# Use Case Pattern (Clean Architecture)

> Related PRD: #[[file:docs/PRD-architecture.md]] (Layered Architecture)

## Overview

Business logic is organized as **Use Cases** following Clean Architecture principles. Each use case is a single-purpose class that encapsulates one business operation with built-in validation, permission checking, and transaction support.

## Architecture

```
pkg/bot/services/
├── base.service.ts          # Framework-agnostic base (validation, lifecycle hooks)
├── base.ts                  # Project-specific base (transactions, repos, logger)
├── admin/                   # Admin domain use cases
│   ├── index.ts             # Exports all use cases
│   ├── register.ts          # Register use case
│   ├── getByTelegramId.ts   # GetByTelegramId use case
│   └── ...
├── group/                   # Group domain use cases
└── keyword/                 # Keyword domain use cases
```

## Base Classes

### BaseService (Framework-Agnostic)
Abstract base providing the use case lifecycle:

```typescript
abstract class BaseService<TInput, TResult> {
  protected inputSchema?: z.ZodType<TInput>;  // Optional Zod schema for validation
  
  async run(inputData: unknown): Promise<TResult>;           // Entry point
  protected validate(data: unknown): TInput;                  // Input validation
  protected abstract checkPermissions(data: TInput): Promise<void>;  // Auth check
  protected abstract execute(data: TInput): Promise<TResult>;        // Business logic
  protected async onSuccess(result, context): Promise<void>;  // Post-success hook
  protected async onError(error, context): Promise<void>;     // Error hook
  protected async aroundExecute(data, proceed): Promise<TResult>;    // Middleware hook
}
```

### Base (Project-Specific)
Extends BaseService with project dependencies:

```typescript
abstract class Base<TInput, TResult> extends BaseService<TInput, TResult> {
  protected connection: Connection;
  protected logger: FastifyBaseLogger;
  protected get repos(): Repositories;  // Transaction-aware repositories
  
  // Automatically wraps execute() in database transaction for postgres
  protected override async aroundExecute(data, proceed): Promise<TResult>;
}
```

## Use Case Structure

Each use case is a class that extends `Base`:

```typescript
import z from "zod";
import {Base} from "../base";

const inputSchema = z.object({
  telegramUserId: z.string(),
  telegramUsername: z.string().nullable(),
});

type Input = z.infer<typeof inputSchema>;

export class Register extends Base<Input, Admin> {
  protected inputSchema = inputSchema;

  protected async checkPermissions(): Promise<void> {
    // Registration is open to anyone
  }

  protected async execute(data: Input): Promise<Admin> {
    const existing = await this.repos.admin.findByTelegramId(data.telegramUserId);
    
    if (existing) {
      if (existing.status === "inactive") {
        const updated = await this.repos.admin.update(existing.pk, {status: "active"});
        return updated!;
      }
      throw new ConflictError("You are already registered");
    }

    return await this.repos.admin.create({
      telegram_user_id: data.telegramUserId,
      telegram_username: data.telegramUsername,
    });
  }
}
```

## Lifecycle Flow

When `run()` is called:

1. **validate()** - Parse input through Zod schema (if defined)
2. **checkPermissions()** - Verify authorization
3. **aroundExecute()** - Wrap in transaction (postgres) or call directly (memory)
4. **execute()** - Run business logic
5. **onSuccess()** / **onError()** - Post-execution hooks

## Error Handling

Use cases throw errors for all failure cases. Callers catch and convert to appropriate responses.

### Error Classes
Use error classes from `errors/index.ts`:
- `NotFoundError` - Resource doesn't exist (404)
- `ConflictError` - Duplicate or conflicting state (409)
- `ValidationError` - Invalid input or business rule violation (400)

### When to Throw
- Resource not found
- Duplicate entry / conflict
- Business rule violations
- Permission denied

## Transaction Support

The `Base` class automatically wraps `execute()` in a database transaction for postgres connections:

```typescript
// In Base.aroundExecute():
if (this.connection.type === "memory") {
  return proceed(cleanData);  // No transaction needed
}

return this.connection.db.transaction().execute(async (trx) => {
  this.trxRepos = this.baseRepos.withTransaction(trx);
  return proceed(cleanData);
});
```

Use `this.repos` inside `execute()` — it automatically uses transaction-bound repositories.

## Instantiation & Usage

Use cases are instantiated with dependencies and called via `run()`:

```typescript
// In composition root or route handler
const deps = {connection, logger, repos};
const registerAdmin = new Register(deps);

// Call the use case
const admin = await registerAdmin.run({
  telegramUserId: "123456",
  telegramUsername: "john_doe",
});
```

## File Organization

- One use case per file
- File name matches use case name in camelCase (e.g., `register.ts` → `Register`)
- Export all use cases from domain `index.ts`
- Group use cases by domain (admin, group, keyword)

## Key Principles

- **Single Responsibility**: One use case = one business operation
- **Platform-agnostic**: No Telegram/Discord specifics in use cases
- **Testable**: Dependencies injected via constructor
- **Type-safe**: Zod schemas provide runtime validation and TypeScript types
- **Transactional**: Database operations automatically wrapped in transactions
