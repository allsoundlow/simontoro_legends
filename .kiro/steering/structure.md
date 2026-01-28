# Project Structure

> Related PRD: #[[file:docs/PRD-tech-stack.md]] (Repository Structure)

Single application architecture — all group configuration done via Telegram bot commands.

```
/
├── pkg/
│   ├── bot/                    # Main server application (monolith)
│   │   ├── app.ts              # Fastify plugin entry point
│   │   ├── server.ts           # Server bootstrap
│   │   ├── config.loader.ts    # JSON config loading
│   │   ├── config/             # Configuration schemas and options
│   │   │   ├── index.ts        # Zod config schema
│   │   │   └── server-options.ts
│   │   ├── routes/             # Fastify route handlers
│   │   └── local.config.json   # Local development config (gitignored)
│   │
│   └── contracts/              # Shared API contracts (planned)
│
├── docs/                       # Documentation (PRD split by domain)
│   ├── PRD-overview.md         # Introduction, glossary, document index
│   ├── PRD-tech-stack.md       # Tech stack, repo structure, config
│   ├── PRD-architecture.md     # Architecture diagrams and principles
│   ├── PRD-auth.md             # Multi-tenant, Telegram auth, Steam linking
│   ├── PRD-core-features.md    # Keywords, stats, custom commands
│   ├── PRD-platform.md         # Platform integration & abstraction
│   ├── PRD-infrastructure.md   # Persistence, logging, monitoring
│   └── PRD-commands.md         # Command parsing, group admin
└── [root configs]              # tsconfig.json, eslint, prettier
```

## Planned Architecture Layers (pkg/bot)
- `adapters/` - Platform adapters (Telegram, Discord)
- `services/` - Business logic services
- `repositories/` - Business queries using storage adapters
- `storage/` - Storage abstraction layer
  - `adapter.ts` - StorageAdapter interface
  - `adapters/` - Adapter implementations (in-memory, Kysely)
  - `connections/` - Connection setup (memory, PostgreSQL)
- `routes/` - Fastify API routes (internal: health, metrics, webhooks, OAuth callbacks)
- `schemas/` - Zod schemas (auto-generate OpenAPI)
- `connectors/` - Gaming platform connectors (Steam, etc.)

## Key Patterns
- Layered architecture: API → Adapters → Services → Repositories → Storage → Infrastructure
- Storage adapter pattern - repositories work with any storage backend
- Platform adapter isolation - business logic decoupled from chat platforms
- Repository pattern for business queries
- Fastify plugins for modular route registration
- Telegram-first configuration - all admin actions via bot commands
