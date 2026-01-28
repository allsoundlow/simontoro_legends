# Architecture Overview

The application follows a **monolithic architecture** for the server. All group configuration is done through Telegram bot commands — no separate admin dashboard is required. The server auto-generates OpenAPI documentation from TypeScript/Zod schemas for internal API endpoints.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           Monorepo                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                  pkg/bot (Server Monolith)                   │    │
│  │                                                              │    │
│  │  ┌───────────────────────────────────────────────────────┐  │    │
│  │  │ Fastify + OpenAPI/Swagger                             │  │    │
│  │  │ (Auto-generated from Zod)                             │  │    │
│  │  │                                                       │  │    │
│  │  │ • Internal API for health checks, metrics             │  │    │
│  │  │ • Webhook endpoints for Telegram                      │  │    │
│  │  │ • OAuth callbacks for Steam linking                   │  │    │
│  │  └───────────────────────────────────────────────────────┘  │    │
│  │                                                              │    │
│  │  ┌───────────────────────────────────────────────────────┐  │    │
│  │  │ Telegram Bot Interface                                │  │    │
│  │  │                                                       │  │    │
│  │  │ • All group configuration via bot commands            │  │    │
│  │  │ • Admin registration via private chat                 │  │    │
│  │  │ • Keyword, command, and settings management           │  │    │
│  │  └───────────────────────────────────────────────────────┘  │    │
│  │                                                              │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                  pkg/contracts (Planned)                     │    │
│  │  ┌─────────────────┐  ┌─────────────────┐                   │    │
│  │  │ Zod Schemas     │  │ TypeScript      │                   │    │
│  │  │ (Shared Types)  │  │ Types           │                   │    │
│  │  └─────────────────┘  └─────────────────┘                   │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Server Internal Architecture (pkg/bot)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    pkg/bot Internal Architecture                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                      API Layer (Fastify)                       │ │
│  ├────────────────────────────────────────────────────────────────┤ │
│  │                                                                │ │
│  │  ┌──────────────────┐  ┌──────────────────┐                   │ │
│  │  │  REST Routes     │  │  OpenAPI/Swagger │                   │ │
│  │  │  (Internal API)  │  │  Documentation   │                   │ │
│  │  │                  │  │  (Auto-generated)│                   │ │
│  │  │  • /health       │  │                  │                   │ │
│  │  │  • /metrics      │  │  Zod Schemas →   │                   │ │
│  │  │  • /webhook      │  │  OpenAPI Spec    │                   │ │
│  │  │  • /oauth/*      │  │                  │                   │ │
│  │  └──────────────────┘  └──────────────────┘                   │ │
│  │                                                                │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                              │                                      │
│                              ▼                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                    Platform Adapters Layer                     │ │
│  │              (Isolated from Business Logic)                    │ │
│  ├────────────────────────────────────────────────────────────────┤ │
│  │                                                                │ │
│  │  ┌─────────────────┐  ┌─────────────────┐                     │ │
│  │  │ Telegram        │  │ Discord         │                     │ │
│  │  │ Adapter         │  │ Adapter         │                     │ │
│  │  │                 │  │ (Phase 2)       │                     │ │
│  │  │ • Webhook/Poll  │  │ • Gateway       │                     │ │
│  │  │ • Message Parse │  │ • Slash Cmds    │                     │ │
│  │  │ • Response Fmt  │  │ • Embeds        │                     │ │
│  │  │ • Admin Cmds    │  │                 │                     │ │
│  │  └────────┬────────┘  └────────┬────────┘                     │ │
│  │           │                    │                              │ │
│  │           └────────┬───────────┘                              │ │
│  │                    │                                          │ │
│  │                    ▼                                          │ │
│  │           ┌────────────────────┐                              │ │
│  │           │ Message Normalizer │                              │ │
│  │           │ (Common Format)    │                              │ │
│  │           └────────────────────┘                              │ │
│  │                                                                │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                              │                                      │
│                              ▼                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                     Business Logic Layer                       │ │
│  │                  (Core Domain Services)                        │ │
│  ├────────────────────────────────────────────────────────────────┤ │
│  │                                                                │ │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌────────────────┐ │ │
│  │  │ Command         │  │ Keyword         │  │ Notification   │ │ │
│  │  │ Service         │  │ Service         │  │ Service        │ │ │
│  │  │                 │  │                 │  │                │ │ │
│  │  │ • Parse/Route   │  │ • Pattern Match │  │ • Format Msg   │ │ │
│  │  │ • Cooldowns     │  │ • Cooldowns     │  │ • Send Alert   │ │ │
│  │  │ • Aliases       │  │ • Wildcards     │  │                │ │ │
│  │  └─────────────────┘  └─────────────────┘  └────────────────┘ │ │
│  │                                                                │ │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌────────────────┐ │ │
│  │  │ Stats           │  │ Custom Command  │  │ Group Admin    │ │ │
│  │  │ Service         │  │ Service         │  │ Service        │ │ │
│  │  │                 │  │                 │  │                │ │ │
│  │  │ • Fetch Stats   │  │ • CRUD Cmds     │  │ • Permissions  │ │ │
│  │  │ • Compare       │  │ • Variables     │  │ • Settings     │ │ │
│  │  │ • Cache         │  │ • Media         │  │ • Registration │ │ │
│  │  └─────────────────┘  └─────────────────┘  └────────────────┘ │ │
│  │                                                                │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                              │                                      │
│                              ▼                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                    Data Access Layer                           │ │
│  ├────────────────────────────────────────────────────────────────┤ │
│  │                                                                │ │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌────────────────┐ │ │
│  │  │ Group           │  │ Command         │  │ Keyword        │ │ │
│  │  │ Repository      │  │ Repository      │  │ Repository     │ │ │
│  │  └─────────────────┘  └─────────────────┘  └────────────────┘ │ │
│  │                                                                │ │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌────────────────┐ │ │
│  │  │ Admin           │  │ Stats Cache     │  │ Audit Log      │ │ │
│  │  │ Repository      │  │ Repository      │  │ Repository     │ │ │
│  │  └─────────────────┘  └─────────────────┘  └────────────────┘ │ │
│  │                                                                │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                              │                                      │
│                              ▼                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                    Infrastructure Layer                        │ │
│  ├────────────────────────────────────────────────────────────────┤ │
│  │                                                                │ │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌────────────────┐ │ │
│  │  │ PostgreSQL      │  │ Redis           │  │ Gaming API     │ │ │
│  │  │ (Kysely)        │  │ (Cache)         │  │ Connectors     │ │ │
│  │  │                 │  │                 │  │                │ │ │
│  │  │ • Admins        │  │ • Stats Cache   │  │ • Steam        │ │ │
│  │  │ • Groups        │  │ • Rate Limits   │  │ • PSN          │ │ │
│  │  │ • Commands      │  │ • Cooldowns     │  │ • Xbox         │ │ │
│  │  │ • Keywords      │  │                 │  │                │ │ │
│  │  │ • Audit Logs    │  │                 │  │                │ │ │
│  │  └─────────────────┘  └─────────────────┘  └────────────────┘ │ │
│  │                                                                │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## External Services

```
┌─────────────────────────────────────────────────────────────────────┐
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │   Telegram   │  │   Discord    │  │ Gaming APIs  │               │
│  │   Bot API    │  │   Gateway    │  │ Steam/PSN/   │               │
│  │              │  │   (Phase 2)  │  │ Xbox         │               │
│  └──────────────┘  └──────────────┘  └──────────────┘               │
└─────────────────────────────────────────────────────────────────────┘
```

## Architecture Principles

### Single Application Architecture
- All functionality contained in pkg/bot
- No separate admin dashboard — all configuration via Telegram bot commands
- Simpler deployment and maintenance
- Reduced complexity in authentication and state synchronization

### Telegram-First Configuration
- Administrators register via `/register` command in private chat
- Group configuration done through bot commands in the group
- No web UI required for basic operations
- Telegram admin status used for authorization

### Layered Architecture (pkg/bot)
- Clear separation between API, Platform Adapters, Business Logic, Data Access, and Infrastructure
- Each layer only depends on layers below it
- Business logic is completely isolated from platform-specific code

### Platform Adapter Isolation
- Telegram and Discord adapters are isolated from business logic
- All platform messages are normalized to a common format before reaching business services
- Platform-specific formatting happens only in the adapter layer
- Adding a new chat platform requires only a new adapter, no changes to business logic

### API-First Design
- Fastify routes define API contracts using Zod schemas
- OpenAPI/Swagger documentation auto-generated from schemas
- Internal APIs for health checks, metrics, and webhooks
- Type safety maintained across the entire stack

### SOLID Principles (Applied Pragmatically)
- **Single Responsibility**: Each service handles one domain concern
- **Open/Closed**: Platform connectors can be added without modifying existing code
- **Liskov Substitution**: All platform adapters implement the same interface
- **Interface Segregation**: Small, focused interfaces for repositories and services
- **Dependency Inversion**: Business logic depends on abstractions (interfaces), not concrete implementations

### Repository Pattern
- Data access is abstracted through repositories
- Kysely queries are encapsulated, not scattered through business logic
- Easy to test business logic with mock repositories
