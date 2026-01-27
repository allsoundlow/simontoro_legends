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

### Admin Dashboard (pkg/admin-dashboard)
- **Framework**: React with TypeScript
- **UI Library**: shadcn/ui, Bootstrap, or Material UI (developer preference)
- **Build Tool**: Vite
- **State Management**: TanStack Query for server state
- **API Communication**: RPC-style calls using shared API contracts from OpenAPI spec

### Shared Packages (pkg/shared or pkg/contracts)
- **API Contracts**: Shared TypeScript types and Zod schemas between server and client
- **Generated from OpenAPI**: Client SDK auto-generated from Fastify's OpenAPI documentation

### Infrastructure
- **Containerization**: Docker
- **Logging**: Pino (structured JSON logging)
- **Configuration**: JSON config files (see `pkg/bot/local.config.json` pattern) - no .env files

### Gaming Platform APIs
- **Steam**: Steam Web API (Primary - Phase 1)
- **PlayStation**: PlayStation Network API (unofficial) - Future
- **Xbox**: Xbox Live API - Future

## Repository Structure

The project is organized as a **monorepo** with shared API contracts between applications:

```
/
├── pkg/
│   ├── bot/                      # Main server application (monolith)
│   │   ├── src/
│   │   │   ├── adapters/         # Platform adapters (Telegram, Discord)
│   │   │   ├── services/         # Business logic services
│   │   │   ├── repositories/     # Data access layer
│   │   │   ├── routes/           # Fastify API routes
│   │   │   ├── schemas/          # Zod schemas (auto-generate OpenAPI)
│   │   │   └── connectors/       # Gaming platform connectors
│   │   ├── config/
│   │   ├── local.config.json
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── admin-dashboard/          # React admin application
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── pages/
│   │   │   ├── api/              # Generated API client from OpenAPI
│   │   │   └── hooks/            # TanStack Query hooks
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── contracts/                # Shared API contracts
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
  "database": {
    "host": "localhost",
    "port": 5432,
    "database": "gaming_bot",
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

No `.env` files are used. Different environments use different config files (e.g., `local.config.json`, `prod.config.json`).
