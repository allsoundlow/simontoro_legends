# Architecture Guidelines

> Related PRD: #[[file:docs/PRD-architecture.md]]

## Single Application Architecture
- All functionality contained in pkg/bot — no separate admin dashboard
- All group configuration done via Telegram bot commands
- Internal APIs only for health checks, metrics, webhooks, and OAuth callbacks

## Layered Architecture
Follow this dependency flow - each layer only depends on layers below it:

```
Routes (API) → Services (Business Logic) → Repositories (Data Access) → Infrastructure
     ↓
Platform Adapters (Telegram/Discord)
```

## Services
- Contain business logic, validation rules, and orchestration
- Should be platform-agnostic (no Telegram/Discord specifics)
- Receive dependencies via constructor injection
- Return domain objects, not HTTP responses

```typescript
// services/keyword.service.ts
export class KeywordService {
  constructor(private repo: KeywordRepository) {}
  
  async addKeyword(groupId: string, keyword: string): Promise<Keyword> {
    // business logic here
  }
}
```

## Repositories
- Contain business queries for specific entities
- Work with StorageAdapter abstraction (not specific implementations)
- One repository per aggregate/entity
- Return domain objects, handle timestamps and defaults

See #[[file:.kiro/steering/repositories.md]] for detailed patterns.

## Storage Layer
- StorageAdapter interface abstracts data source operations
- Adapter implementations: InMemoryAdapter (testing), PostgresAdapter (PostgreSQL, uses Kysely internally)
- Connections handle setup/teardown of data sources (return pg Pool for postgres)
- Repositories receive adapters via constructor injection

## Platform Adapters
- Isolate chat platform specifics (Telegram, Discord)
- Normalize incoming messages to a common format
- Format outgoing messages for the target platform
- Handle admin commands for group configuration
- Never leak platform details into services

## Connectors
- Handle external API integrations (Steam, PSN, Xbox)
- Implement rate limiting and caching
- Return normalized data structures
- Handle API errors gracefully

## Dependency Injection
- Pass dependencies explicitly via constructors
- Wire up dependencies in the composition root (app.ts or a dedicated file)
- Create storage connection once, pass adapters to repositories
- Avoid global singletons except for truly global concerns (logger)

```typescript
// Composition root example
// If config.pg exists → postgres, otherwise → memory
const connection = createConnection(config);
const keywordAdapter = createAdapter<Keyword, "keywords">(connection, "keywords");
const keywordRepo = new KeywordRepository(keywordAdapter);
const keywordService = new KeywordService(keywordRepo);
```
