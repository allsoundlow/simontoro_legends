# Architecture Guidelines

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
- Abstract data access behind a clean interface
- Use Kysely for type-safe SQL queries
- One repository per aggregate/entity
- Return domain objects, handle DB-specific concerns internally

## Platform Adapters
- Isolate chat platform specifics (Telegram, Discord)
- Normalize incoming messages to a common format
- Format outgoing messages for the target platform
- Never leak platform details into services

## Connectors
- Handle external API integrations (Steam, PSN, Xbox)
- Implement rate limiting and caching
- Return normalized data structures
- Handle API errors gracefully

## Dependency Injection
- Pass dependencies explicitly via constructors
- Wire up dependencies in the composition root (app.ts or a dedicated file)
- Avoid global singletons except for truly global concerns (logger)
