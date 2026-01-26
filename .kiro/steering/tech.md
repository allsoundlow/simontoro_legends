# Tech Stack & Build System

## Runtime & Language
- Node.js v22+
- TypeScript (strict mode, ESNext target, NodeNext modules)

## Backend Framework (pkg/bot)
- **Fastify** - HTTP server for API endpoints and webhooks
- **Zod** - Runtime schema validation (integrated with Fastify for OpenAPI generation)
- **Kysely** - Type-safe SQL query builder (no ORM)
- **Pino** - Structured JSON logging

## Planned Infrastructure
- PostgreSQL for persistence
- Redis for caching and rate limiting

## Chat Platform SDKs
- Telegram: grammy or node-telegram-bot-api (Phase 1)
- Discord: discord.js (Phase 2)

## Code Quality
- ESLint with typescript-eslint
- Prettier for formatting
- eslint-plugin-simple-import-sort for import ordering

## Common Commands

```bash
# Development (from pkg/bot)
yarn dev              # Start dev server with hot reload (tsx --watch)

# Linting (from root)
yarn eslint .         # Run ESLint

# Formatting (from root)
yarn prettier --check .   # Check formatting
yarn prettier --write .   # Fix formatting
```

## Configuration
- JSON config files (e.g., `local.config.json`) - **no .env files**
- Config path set via `CONFIG_PATH` environment variable
- Zod schemas validate configuration at startup
