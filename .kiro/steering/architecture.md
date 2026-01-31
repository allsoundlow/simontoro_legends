# Architecture Guidelines

> Related PRD: #[[file:docs/PRD-architecture.md]]

## Single Application Architecture
- All functionality contained in pkg/bot — no separate admin dashboard
- All group configuration done via Telegram bot commands
- Internal APIs only for health checks, metrics, webhooks, and OAuth callbacks

## Layered Architecture (Clean Architecture)
Follow this dependency flow - each layer only depends on layers below it:

```
Routes/Adapters (Interface) → Use Cases (Application) → Repositories (Data Access) → Infrastructure
         ↓
Platform Adapters (Telegram/Discord)
```

## Use Cases (Application Layer)
Business logic is organized as **Use Cases** following Clean Architecture:

- Each use case is a single-purpose class (one operation per class)
- Built-in validation via Zod schemas
- Built-in permission checking
- Automatic transaction wrapping for postgres
- Platform-agnostic (no Telegram/Discord specifics)

```typescript
// services/admin/register.ts
export class Register extends Base<Input, Admin> {
  protected inputSchema = inputSchema;
  
  protected async checkPermissions(): Promise<void> { /* ... */ }
  protected async execute(data: Input): Promise<Admin> { /* ... */ }
}

// Usage
const registerAdmin = new Register({connection, logger, repos});
const admin = await registerAdmin.run({telegramUserId: "123", telegramUsername: "john"});
```

See #[[file:.kiro/steering/services.md]] for detailed use case patterns.

## Repositories (Data Access Layer)
- Contain business queries for specific entities
- Work with StorageAdapter abstraction (not specific implementations)
- One repository per aggregate/entity
- Return domain objects, handle timestamps and defaults
- Support transaction binding via `withTransaction(trx)`

See #[[file:.kiro/steering/repositories.md]] for detailed patterns.

## Storage Layer (Infrastructure)
- StorageAdapter interface abstracts data source operations
- Adapter implementations: InMemoryAdapter (testing), PostgresAdapter (PostgreSQL, uses Kysely internally)
- Connections handle setup/teardown of data sources (return pg Pool for postgres)
- Repositories receive adapters via constructor injection

## Platform Adapters (Interface Layer)
- Isolate chat platform specifics (Telegram, Discord)
- Normalize incoming messages to a common format
- Format outgoing messages for the target platform
- Handle admin commands for group configuration
- Call use cases to execute business logic
- Never leak platform details into use cases

## Connectors
- Handle external API integrations (Steam, PSN, Xbox)
- Implement rate limiting and caching
- Return normalized data structures
- Handle API errors gracefully

## Dependency Injection
- Pass dependencies explicitly via constructors
- Wire up dependencies in the composition root (app.ts or a dedicated file)
- Create storage connection once, pass to Repositories container
- Use cases receive `{connection, logger, repos}` dependencies

```typescript
// Composition root example
const connection = createConnection(config);
const repos = new Repositories(connection);

// Use case instantiation
const deps = {connection, logger: fastify.log, repos};
const registerAdmin = new Register(deps);
```
