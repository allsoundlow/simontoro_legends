# Tech Stack & Repository Structure

## Tech Stack

### Backend (pkg/bot)
- **Runtime**: Node.js (v22+)
- **Language**: TypeScript (strict mode)
- **Web Framework**: Fastify - high-performance HTTP server for API endpoints and webhooks
- **API Documentation**: Fastify with TypeScript schemas auto-generating OpenAPI/Swagger documentation
- **Database**: PostgreSQL - relational database for persistent storage
- **Caching**: Redis - for stats caching and rate limiting
- **Query Builder**: Kysely - type-safe SQL query builder (no ORM)
- **Validation**: Zod - runtime schema validation (integrated with Fastify for auto-generated OpenAPI specs)

### Chat Platform SDKs
- **Telegram**: grammy or node-telegram-bot-api (Phase 1 - Primary)
- **Discord**: discord.js (Phase 2 - Future)

### Shared Packages (pkg/contracts) - Planned
- **API Contracts**: Shared TypeScript types and Zod schemas
- **Used for**: Type sharing between bot and future integrations

### Infrastructure
- **Containerization**: Docker
- **Logging**: Pino (structured JSON logging)
- **Configuration**: JSON config files (see `pkg/bot/local.config.json` pattern) - no .env files

### Gaming Platform APIs
- **Steam**: Steam Web API (Primary - Phase 1)
- **PlayStation**: PlayStation Network API (unofficial) - Future
- **Xbox**: Xbox Live API - Future

## Repository Structure

The project is organized as a **monorepo** with a single main application:

```
/
├── utils/                        # Shared helper functions (used by all packages)
│   └── [helper-name].ts          # Or single utils.ts file for small utilities
│
├── pkg/
│   ├── bot/                      # Main server application (monolith)
│   │   ├── adapters/             # Platform adapters (Telegram, Discord)
│   │   ├── services/             # Business logic services
│   │   ├── repositories/         # Business queries using storage adapters
│   │   ├── storage/              # Storage abstraction layer
│   │   │   ├── adapter.ts        # StorageAdapter interface + types
│   │   │   ├── adapters/         # Adapter implementations
│   │   │   │   ├── in-memory.adapter.ts  # For testing
│   │   │   │   └── postgres.adapter.ts   # PostgreSQL via Kysely
│   │   │   ├── connections/      # Connection setup
│   │   │   │   ├── index.ts      # Connection factory
│   │   │   │   ├── memory.connection.ts
│   │   │   │   └── postgres.connection.ts
│   │   │   └── index.ts          # Exports + createAdapter factory
│   │   ├── routes/               # Fastify API routes (internal: health, webhooks, OAuth)
│   │   ├── schemas/              # Zod schemas (auto-generate OpenAPI)
│   │   ├── connectors/           # Gaming platform connectors
│   │   ├── config/               # Configuration schemas
│   │   ├── local.config.json     # Local development config (gitignored)
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── contracts/                # Shared API contracts (planned)
│       ├── src/
│       │   ├── schemas/          # Shared Zod schemas
│       │   └── types/            # Shared TypeScript types
│       ├── package.json
│       └── tsconfig.json
│
├── docs/                         # Documentation
├── package.json                  # Root package.json (workspace config)
└── tsconfig.json                 # Root TypeScript config
```

## Configuration

Configuration is managed through JSON config files, following the existing pattern in `pkg/bot/local.config.json`:

```json
{
  "port": 3000,
  "host": "0.0.0.0",
  "logger": {
    "logLevel": "info",
    "pretty": true
  },
  "pg": {
    "host": "localhost",
    "port": 5432,
    "database": "saimontoro",
    "user": "bot",
    "password": "secret"
  },
  "redis": {
    "host": "localhost",
    "port": 6379
  },
  "telegram": {
    "token": "BOT_TOKEN",
    "webhookUrl": "https://example.com/webhook/telegram"
  },
  "discord": {
    "token": "BOT_TOKEN",
    "clientId": "CLIENT_ID"
  },
  "platforms": {
    "steam": {
      "apiKey": "STEAM_API_KEY"
    }
  }
}
```

For testing without a database, simply omit the `pg` configuration — the application will use in-memory storage:
```json
{
  "port": 3001,
  "host": "localhost",
  "logger": {"logLevel": "info", "pretty": false}
}
```

No `.env` files are used. Different environments use different config files (e.g., `local.config.json`, `prod.config.json`).

## Administration Model

All group configuration is done through Telegram bot commands — no separate admin dashboard required:

- **Registration**: Administrators register via `/register` command in private chat with the bot
- **Group Setup**: Add bot to group, bot verifies Telegram admin status
- **Configuration**: All keywords, commands, and settings managed via bot commands in the group
- **Authentication**: Telegram user ID used as unique identifier — no separate login required
