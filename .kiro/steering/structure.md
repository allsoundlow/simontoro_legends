# Project Structure

Monorepo with shared API contracts between applications.

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
│   ├── admin-dashboard/        # React admin app (planned)
│   └── contracts/              # Shared API contracts (planned)
│
├── docs/                       # Documentation
│   └── PRD-gaming-group-chatbot.md
└── [root configs]              # tsconfig.json, eslint, prettier
```

## Planned Architecture Layers (pkg/bot)
- `adapters/` - Platform adapters (Telegram, Discord)
- `services/` - Business logic services
- `repositories/` - Data access layer
- `routes/` - Fastify API routes
- `schemas/` - Zod schemas (auto-generate OpenAPI)
- `connectors/` - Gaming platform connectors (Steam, etc.)

## Key Patterns
- Layered architecture: API → Adapters → Services → Repositories → Infrastructure
- Platform adapter isolation - business logic decoupled from chat platforms
- Repository pattern for data access
- Fastify plugins for modular route registration
