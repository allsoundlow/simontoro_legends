# Architecture Overview

The application follows a **monolithic architecture** for the server with a **separate admin dashboard application**. Both applications share API contracts through the monorepo structure. The server auto-generates OpenAPI documentation from TypeScript/Zod schemas, which the admin dashboard uses for type-safe API communication.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           Monorepo                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                  pkg/contracts (Shared)                      │    │
│  │  ┌─────────────────┐  ┌─────────────────┐                   │    │
│  │  │ Zod Schemas     │  │ TypeScript      │                   │    │
│  │  │ (API Contracts) │  │ Types           │                   │    │
│  │  └─────────────────┘  └─────────────────┘                   │    │
│  └──────────────────────────┬──────────────────────────────────┘    │
│                             │                                        │
│              ┌──────────────┴──────────────┐                        │
│              ▼                              ▼                        │
│  ┌─────────────────────────┐  ┌─────────────────────────────────┐  │
│  │  pkg/admin-dashboard    │  │  pkg/bot (Server Monolith)      │  │
│  │  (React Application)    │  │                                 │  │
│  │                         │  │  ┌───────────────────────────┐  │  │
│  │  ┌───────────────────┐  │  │  │ Fastify + OpenAPI/Swagger │  │  │
│  │  │ TanStack Query    │  │  │  │ (Auto-generated from Zod) │  │  │
│  │  │ + Generated API   │◄─┼──┼─►│                           │  │  │
│  │  │ Client            │  │  │  └───────────────────────────┘  │  │
│  │  └───────────────────┘  │  │                                 │  │
│  │                         │  │                                 │  │
│  │  ┌───────────────────┐  │  │                                 │  │
│  │  │ React Components  │  │  │                                 │  │
│  │  │ (shadcn/MUI/etc)  │  │  │                                 │  │
│  │  └───────────────────┘  │  │                                 │  │
│  └─────────────────────────┘  │                                 │  │
│                               │                                 │  │
└───────────────────────────────┴─────────────────────────────────┴──┘
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
│  │  │  (Admin API)     │  │  Documentation   │                   │ │
│  │  │                  │  │  (Auto-generated)│                   │ │
│  │  │  • /commands     │  │                  │                   │ │
│  │  │  • /keywords     │  │  Zod Schemas →   │                   │ │
│  │  │  • /groups       │  │  OpenAPI Spec    │                   │ │
│  │  │  • /stats        │  │                  │                   │ │
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
│  │  │                 │  │                 │                     │ │
│  │  │ • Webhook/Poll  │  │ • Gateway       │                     │ │
│  │  │ • Message Parse │  │ • Slash Cmds    │                     │ │
│  │  │ • Response Fmt  │  │ • Embeds        │                     │ │
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
│  │  │ • Cache         │  │ • Media         │  │                │ │ │
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
│  │  ┌─────────────────┐  ┌─────────────────┐                     │ │
│  │  │ Stats Cache     │  │ Audit Log       │                     │ │
│  │  │ Repository      │  │ Repository      │                     │ │
│  │  └─────────────────┘  └─────────────────┘                     │ │
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
│  │  │ • Groups        │  │ • Stats Cache   │  │ • Steam        │ │ │
│  │  │ • Commands      │  │ • Rate Limits   │  │ • PSN          │ │ │
│  │  │ • Keywords      │  │ • Cooldowns     │  │ • Xbox         │ │ │
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
│  │              │  │              │  │ Xbox         │               │
│  └──────────────┘  └──────────────┘  └──────────────┘               │
└─────────────────────────────────────────────────────────────────────┘
```

## Architecture Principles

### Monorepo with Shared Contracts
- Single repository containing all packages
- Shared API contracts ensure type safety between server and client
- OpenAPI spec generated from Zod schemas provides single source of truth
- Admin dashboard generates API client from OpenAPI spec

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
- Admin dashboard consumes API via generated client
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
