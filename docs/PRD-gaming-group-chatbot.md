# Product Requirements Document: Gaming Group Chatbot

## Introduction

This document defines the product requirements for a gaming group chatbot designed for friends gaming groups, with **Telegram as the primary platform** (Discord support planned for Phase 2). The chatbot enhances the group's gaming experience by providing keyword notifications, game statistics lookup, custom group commands, and seamless integration with gaming platforms.

The system is **multi-tenant** — any person can register as an administrator, create their own group configuration, and manage their bot settings independently. Each administrator has access only to their own groups, ensuring complete isolation between different gaming communities.

The focus is on **group-centric functionality** — features that benefit the gaming community as a whole rather than individual user management.

## Platform Priority

1. **Phase 1 (MVP)**: Telegram — primary platform, full feature support
2. **Phase 2**: Discord — secondary platform, feature parity with Telegram

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
│   └── PRD-gaming-group-chatbot.md
├── package.json                  # Root package.json (workspace config)
└── tsconfig.json                 # Root TypeScript config
```

## Architecture Overview

The application follows a **monolithic architecture** for the server with a **separate admin dashboard application**. Both applications share API contracts through the monorepo structure. The server auto-generates OpenAPI documentation from TypeScript/Zod schemas, which the admin dashboard uses for type-safe API communication.

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

                    External Services
┌─────────────────────────────────────────────────────────────────────┐
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │   Telegram   │  │   Discord    │  │ Gaming APIs  │               │
│  │   Bot API    │  │   Gateway    │  │ Steam/PSN/   │               │
│  │              │  │              │  │ Xbox         │               │
│  └──────────────┘  └──────────────┘  └──────────────┘               │
└─────────────────────────────────────────────────────────────────────┘
```

### Architecture Principles

**Monorepo with Shared Contracts**
- Single repository containing all packages
- Shared API contracts ensure type safety between server and client
- OpenAPI spec generated from Zod schemas provides single source of truth
- Admin dashboard generates API client from OpenAPI spec

**Layered Architecture (pkg/bot)**
- Clear separation between API, Platform Adapters, Business Logic, Data Access, and Infrastructure
- Each layer only depends on layers below it
- Business logic is completely isolated from platform-specific code

**Platform Adapter Isolation**
- Telegram and Discord adapters are isolated from business logic
- All platform messages are normalized to a common format before reaching business services
- Platform-specific formatting happens only in the adapter layer
- Adding a new chat platform requires only a new adapter, no changes to business logic

**API-First Design**
- Fastify routes define API contracts using Zod schemas
- OpenAPI/Swagger documentation auto-generated from schemas
- Admin dashboard consumes API via generated client
- Type safety maintained across the entire stack

**SOLID Principles (Applied Pragmatically)**
- **Single Responsibility**: Each service handles one domain concern
- **Open/Closed**: Platform connectors can be added without modifying existing code
- **Liskov Substitution**: All platform adapters implement the same interface
- **Interface Segregation**: Small, focused interfaces for repositories and services
- **Dependency Inversion**: Business logic depends on abstractions (interfaces), not concrete implementations

**Repository Pattern**
- Data access is abstracted through repositories
- Kysely queries are encapsulated, not scattered through business logic
- Easy to test business logic with mock repositories

### Configuration

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

## Glossary

- **Bot**: The gaming group chatbot application that processes group messages and provides automated responses
- **Keyword_Watcher**: The component responsible for monitoring group chat messages for configured keywords
- **Notification_Service**: The service that delivers alerts to the same channel where the keyword was mentioned
- **Platform_Connector**: An integration module that connects to external gaming platforms (Steam, etc.)
- **Gaming_Platform_Connector**: Specifically for Steam/PSN/Xbox integrations where users link their accounts
- **Command_Handler**: The component that parses and routes commands to appropriate handlers
- **Group_Config**: The configuration settings for the bot within a specific group
- **Custom_Command**: A group-defined command with a trigger and response template
- **Admin_Dashboard**: A web interface for administrators to configure bot commands, keywords, and view usage statistics
- **Administrator**: A registered user who manages one or more group configurations (isolated from other admins)
- **Telegram_Session**: The authenticated connection to Telegram established via QR code or phone number

## Requirements

### Requirement 1: Keyword Notification System

**User Story:** As a group member, I want the bot to notify the group when specific keywords are mentioned, so that important topics like game names, events, or raid calls get highlighted and don't get lost in chat.

#### Acceptance Criteria

1. WHEN a message containing a configured keyword is posted in the group chat, THE Keyword_Watcher SHALL detect the match within 2 seconds
2. WHEN a keyword match is detected, THE Notification_Service SHALL post a highlighted notification **in the same channel where the keyword was mentioned**
3. WHEN a group admin adds a new keyword to the group watch list, THE Bot SHALL confirm the addition and begin monitoring immediately
4. WHEN a group admin removes a keyword from the watch list, THE Bot SHALL confirm the removal and stop monitoring for that keyword
5. WHEN a user lists watched keywords, THE Bot SHALL display all currently configured keywords for the group
6. THE Keyword_Watcher SHALL support case-insensitive matching by default
7. WHERE a group admin configures case-sensitive matching for a keyword, THE Keyword_Watcher SHALL respect the case sensitivity setting
8. WHEN multiple keywords match a single message, THE Notification_Service SHALL send only one consolidated notification
9. IF the message author is the one who configured the keyword, THEN THE Notification_Service SHALL still notify the group (keywords are group-wide, not personal)
10. THE Bot SHALL support keyword patterns including exact words, phrases, and simple wildcards (e.g., "raid*" matches "raid", "raiding", "raids")
11. WHEN a keyword notification is triggered, THE Bot SHALL include the original message context, author, and matched keyword(s)
12. THE Bot SHALL support configuring a cooldown period per keyword to prevent notification spam

### Requirement 2: Game Statistics Lookup

**User Story:** As a group member, I want to look up game statistics for players who have linked their gaming accounts, so that we can discuss performance, celebrate achievements, and fuel friendly competition.

#### Acceptance Criteria

1. WHEN a user requests stats for a game and player name, THE Platform_Connector SHALL retrieve and display relevant statistics to the group (only for users who have linked their accounts)
2. WHEN a user requests a stats comparison between two players, THE Bot SHALL display a side-by-side comparison in the group chat
3. THE Bot SHALL cache statistics data to reduce API calls and improve response time
4. WHEN cached data is older than the configured TTL (default: 15 minutes), THE Platform_Connector SHALL refresh the data on next request
5. IF statistics are unavailable for a game or player, THEN THE Bot SHALL inform the group which games and regions are supported
6. THE Bot SHALL format statistics in a readable, visually appealing manner suitable for the chat platform
7. WHEN displaying stats, THE Bot SHALL include the data freshness timestamp
8. THE Bot SHALL support statistics lookup for Steam platform (primary), with PlayStation Network and Xbox Live as future additions
9. WHEN a platform API is rate-limited, THE Bot SHALL inform the group and suggest trying again later
10. THE Bot SHALL only access statistics for users who have explicitly linked their gaming accounts and granted permission

### Requirement 3: Custom Group Commands

**User Story:** As a group admin, I want to create custom commands with predefined responses, so that our group can have shortcuts for frequently shared information like server IPs, voice channel links, or group rules.

#### Acceptance Criteria

1. WHEN a group admin creates a custom command, THE Bot SHALL store the command trigger and response for that group
2. WHEN a user invokes a custom command, THE Bot SHALL respond with the configured message in the group chat
3. WHEN a group admin updates a custom command, THE Bot SHALL use the new response immediately
4. WHEN a group admin deletes a custom command, THE Bot SHALL stop responding to that trigger
5. WHEN a user lists custom commands, THE Bot SHALL display all available group commands with descriptions
6. THE Bot SHALL support variable substitution in command responses (e.g., {user} for invoking user, {date}, {time}, {group})
7. IF a custom command conflicts with a built-in command, THEN THE Bot SHALL reject the creation and suggest an alternative trigger
8. THE Bot SHALL support multi-line responses for custom commands
9. WHEN creating a command, THE Bot SHALL allow setting an optional description for the help listing

### Requirement 4: Platform Integration Architecture

**User Story:** As a system maintainer, I want a modular platform integration architecture, so that new gaming platforms can be added without major refactoring.

#### Acceptance Criteria

1. THE Platform_Connector SHALL implement a common interface for all gaming platform integrations
2. WHEN a new platform integration is added, THE Bot SHALL load it without requiring changes to core bot logic
3. THE Platform_Connector SHALL handle API authentication securely
4. THE Platform_Connector SHALL implement rate limiting per platform according to their API guidelines
5. WHEN platform API rate limits are approached, THE Platform_Connector SHALL queue requests appropriately
6. IF a platform API returns an error, THEN THE Platform_Connector SHALL return a standardized error response
7. THE Bot SHALL log all platform API interactions for debugging and monitoring
8. THE Platform_Connector SHALL support configuration of API keys and endpoints per platform

### Requirement 5: Message Platform Abstraction

**User Story:** As a developer, I want the bot to support multiple chat platforms through abstraction, so that the same features work on both Telegram and Discord (when Discord support is added).

#### Acceptance Criteria

1. THE Bot SHALL implement a message platform abstraction layer separating chat platform logic from feature logic
2. WHEN processing incoming messages, THE Bot SHALL normalize them to a common internal format
3. WHEN sending responses, THE Bot SHALL format them appropriately for the target platform
4. THE Bot SHALL support platform-specific formatting (e.g., Discord embeds, Telegram markdown) where available
5. WHEN a formatting feature is not supported on a platform, THE Bot SHALL provide a graceful text fallback
6. THE Bot SHALL maintain separate configuration for each supported chat platform
7. THE Bot SHALL support running on Telegram initially, with Discord support added in Phase 2
8. WHEN a message is received, THE Bot SHALL include platform context (platform type, group ID, channel ID) in the normalized format

### Requirement 6: Data Persistence

**User Story:** As a group, we want our bot configuration and data to persist across restarts, so that we don't lose our keywords, custom commands, and settings.

#### Acceptance Criteria

1. THE Bot SHALL persist all group configurations, keywords, custom commands, and cached data to durable storage
2. WHEN the bot restarts, THE Bot SHALL restore all persisted data and resume normal operation
3. THE Bot SHALL support database migrations for schema changes between versions
4. THE Bot SHALL use a relational database (PostgreSQL) or document store (MongoDB) for persistence
5. WHEN writing to storage, THE Bot SHALL handle write failures gracefully and retry with backoff
6. IF data corruption is detected, THEN THE Bot SHALL log the error and attempt to continue with available data
7. THE Bot SHALL support configuration of database connection parameters via environment variables

### Requirement 7: Command Parsing and Routing

**User Story:** As a group member, I want to interact with the bot using intuitive commands, so that I can easily access all features.

#### Acceptance Criteria

1. THE Bot SHALL parse commands with a configurable prefix (default: "/" for Telegram, "!" for Discord)
2. WHEN a command is received, THE Command_Handler SHALL route it to the appropriate handler based on the command name
3. WHEN an unknown command is received, THE Bot SHALL suggest similar valid commands if a close match exists
4. THE Bot SHALL provide a help command listing all available commands with descriptions
5. WHEN a command has missing or invalid arguments, THE Bot SHALL display usage instructions for that command
6. THE Bot SHALL support command aliases (e.g., "!s" as alias for "!stats")
7. THE Bot SHALL implement per-command cooldowns to prevent spam (configurable per command)
8. WHEN a command is on cooldown for a user, THE Bot SHALL inform them of the remaining cooldown time
9. THE Bot SHALL support subcommands for complex features (e.g., "!keyword add", "!keyword remove", "!keyword list")
10. WHEN parsing commands, THE Bot SHALL handle quoted arguments for multi-word values

### Requirement 8: Group Administration

**User Story:** As a group admin, I want to manage bot settings and permissions, so that I can control how the bot behaves in our group.

#### Acceptance Criteria

1. THE Bot SHALL recognize group administrators based on the chat platform's admin/moderator roles
2. WHEN a non-admin attempts an admin-only command, THE Bot SHALL inform them that the command requires admin privileges
3. WHEN a group admin configures bot settings, THE Bot SHALL apply changes immediately
4. THE Bot SHALL support configuring which features are enabled/disabled per group
5. THE Bot SHALL support configuring the command prefix per group
6. WHEN a group admin requests a settings overview, THE Bot SHALL display all current configuration values
7. THE Bot SHALL support resetting configuration to defaults via admin command
8. WHEN the bot joins a new group, THE Bot SHALL initialize with default configuration and announce available commands

### Requirement 9: Logging and Monitoring

**User Story:** As a system operator, I want comprehensive logging and monitoring, so that I can troubleshoot issues and understand bot usage.

#### Acceptance Criteria

1. THE Bot SHALL log all incoming commands with timestamp, group ID, user ID, and command details
2. THE Bot SHALL log all outgoing responses with timestamp and destination
3. THE Bot SHALL log all platform API calls with request/response details and latency
4. WHEN an error occurs, THE Bot SHALL log the full error context including stack trace
5. THE Bot SHALL support configurable log levels (debug, info, warn, error)
6. THE Bot SHALL output logs in structured JSON format for log aggregation systems
7. THE Bot SHALL expose health check endpoints for monitoring systems
8. WHEN the bot starts, THE Bot SHALL log configuration summary (without sensitive values)

### Requirement 10: Admin Dashboard

**User Story:** As a group administrator, I want a simple web dashboard to configure bot commands and responses, so that I can manage the bot without using chat commands and have a visual overview of the configuration.

#### Acceptance Criteria

1. THE Admin_Dashboard SHALL provide a web interface accessible via browser
2. WHEN an administrator accesses the dashboard, THE Admin_Dashboard SHALL require authentication before granting access
3. THE Admin_Dashboard SHALL display a list of all configured custom commands for the group
4. WHEN an administrator creates a new custom command, THE Admin_Dashboard SHALL provide form fields for trigger, response text, and optional image/media attachment
5. WHEN an administrator edits a custom command, THE Admin_Dashboard SHALL display the current configuration and allow modifications
6. WHEN an administrator saves a command configuration, THE Bot SHALL apply the changes immediately without restart
7. THE Admin_Dashboard SHALL support uploading images or media files to be sent as command responses
8. THE Admin_Dashboard SHALL display a preview of how the command response will appear in chat
9. WHEN an administrator deletes a custom command, THE Admin_Dashboard SHALL confirm the action before removal
10. THE Admin_Dashboard SHALL display a list of configured keywords with their settings (case sensitivity, cooldown)
11. WHEN an administrator adds or modifies a keyword, THE Admin_Dashboard SHALL provide form fields for pattern, case sensitivity, and cooldown period
12. THE Admin_Dashboard SHALL display basic usage statistics (total commands triggered, most used commands)
13. THE Admin_Dashboard SHALL be responsive and work on mobile devices for quick configuration changes
14. THE Admin_Dashboard SHALL support multiple administrator accounts with role-based access
15. WHEN configuration changes are made, THE Admin_Dashboard SHALL log the change with timestamp and administrator identity

### Requirement 11: Multi-Tenant Administration

**User Story:** As a potential administrator, I want to register my own account and create group configurations, so that I can manage my gaming community's bot independently from other administrators.

#### Acceptance Criteria

1. THE System SHALL allow any person to register as an administrator through the Admin_Dashboard
2. WHEN an administrator registers, THE System SHALL create an isolated account with no access to other administrators' data
3. WHEN an administrator creates a group configuration, THE System SHALL associate it exclusively with that administrator's account
4. THE System SHALL ensure that Administrator A cannot view, modify, or access any data belonging to Administrator B
5. WHEN an administrator logs into the Admin_Dashboard, THE System SHALL display only their own groups and configurations
6. THE System SHALL support multiple groups per administrator account
7. WHEN an administrator deletes their account, THE System SHALL remove all associated group configurations and data
8. THE System SHALL provide audit logging of all administrative actions per administrator

### Requirement 12: Administrator Authentication (Auth0)

**User Story:** As an administrator, I want to securely log into the admin dashboard using Auth0, so that I don't need to manage separate credentials and can use my existing social accounts.

#### Acceptance Criteria

1. THE Admin_Dashboard SHALL integrate with [Auth0](https://auth0.com/) for administrator authentication
2. THE System SHALL delegate all authentication and password management to Auth0 — no passwords stored in the system
3. WHEN an administrator accesses the dashboard, THE System SHALL redirect to Auth0's Universal Login page
4. Auth0 SHALL support multiple identity providers (Google, GitHub, email/password) as configured in the Auth0 tenant
5. WHEN an administrator successfully authenticates via Auth0, THE System SHALL create or retrieve their administrator account using the Auth0 user ID
6. THE System SHALL validate Auth0 JWT tokens on each API request
7. WHEN an Auth0 session expires, THE Admin_Dashboard SHALL redirect the administrator to re-authenticate
8. THE System SHALL support session management with configurable timeout (aligned with Auth0 token expiration)
9. WHEN an administrator logs out, THE System SHALL invalidate the session and redirect to Auth0 logout endpoint
10. THE System SHALL store only the Auth0 user ID and profile information (name, email) — never credentials

### Requirement 13: Telegram Group Connection

**User Story:** As an administrator, I want to connect my Telegram account to the system, so that the bot can access and monitor my group chats.

#### Acceptance Criteria

1. THE Admin_Dashboard SHALL provide a mechanism to connect to Telegram via QR code scan or phone number verification
2. WHEN an administrator initiates Telegram connection, THE System SHALL display a QR code for the Telegram app to scan
3. WHEN the QR code is scanned successfully, THE System SHALL establish a Telegram_Session for that administrator
4. THE System SHALL securely store the Telegram_Session credentials for persistent access
5. WHEN a Telegram_Session is established, THE Admin_Dashboard SHALL display the administrator's available Telegram groups
6. THE Administrator SHALL be able to select which Telegram groups to enable bot functionality for
7. WHEN a Telegram_Session expires or is revoked, THE System SHALL notify the administrator and request re-authentication
8. THE System SHALL support multiple Telegram accounts per administrator (for managing different communities)
9. WHEN an administrator disconnects a Telegram account, THE System SHALL stop monitoring associated groups and remove the session

### Requirement 14: Gaming Account Linking (Steam)

**User Story:** As a group member, I want to link my Steam account to the bot, so that my gaming statistics can be looked up by other group members.

#### Acceptance Criteria

1. THE Bot SHALL be registered with Steam Web API and possess a valid API key for reading user data
2. WHEN a group member initiates Steam account linking, THE Bot SHALL guide them through the OAuth/authentication process
3. WHEN a Steam account is successfully linked, THE System SHALL store the Steam ID and access permissions for that user
4. THE Bot SHALL only access Steam data for users who have explicitly linked their accounts
5. WHEN a user unlinks their Steam account, THE System SHALL immediately revoke access and delete stored credentials
6. THE System SHALL display which gaming accounts are linked for each user (without exposing sensitive credentials)
7. WHEN requesting statistics, THE Bot SHALL verify the target user has linked their account before making API calls
8. THE System SHALL support linking multiple gaming platform accounts per user (Steam initially, PSN/Xbox in future)
9. WHEN a linked account's permissions are revoked externally, THE System SHALL detect this and notify the user to re-link
10. THE Bot SHALL respect Steam's privacy settings — if a user's profile is private, THE Bot SHALL inform the requester accordingly

## Authentication & Authorization Architecture

### Overview

The system uses a layered authentication approach with Auth0 handling all credential management:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Authentication Layers                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Layer 1: Admin Dashboard Authentication (Auth0)                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  • Auth0 Universal Login (https://auth0.com/)                │    │
│  │  • Supports Google, GitHub, email/password via Auth0         │    │
│  │  • JWT tokens validated on each request                      │    │
│  │  • NO passwords stored in our system                         │    │
│  │  • Only Auth0 user ID and profile info stored                │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              │                                       │
│                              ▼                                       │
│  Layer 2: Telegram Connection (QR/Phone)                            │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  • QR code scan via Telegram app                             │    │
│  │  • Phone number + verification code fallback                 │    │
│  │  • Telegram session stored securely (encrypted)              │    │
│  │  • Access to admin's Telegram groups                         │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              │                                       │
│                              ▼                                       │
│  Layer 3: Gaming Account Linking (Per User)                         │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  • Steam OpenID authentication                               │    │
│  │  • User grants permission for stats access                   │    │
│  │  • Steam ID stored, linked to Telegram user                  │    │
│  │  • Bot uses system API key to fetch allowed users' data      │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Auth0 Integration Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Auth0 Authentication Flow                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. Admin visits Admin Dashboard                                    │
│                    │                                                 │
│                    ▼                                                 │
│  2. Dashboard redirects to Auth0 Universal Login                    │
│     (https://YOUR_DOMAIN.auth0.com/authorize)                       │
│                    │                                                 │
│                    ▼                                                 │
│  3. Admin chooses login method (Google, GitHub, email/password)     │
│     All handled by Auth0 — our system never sees credentials        │
│                    │                                                 │
│                    ▼                                                 │
│  4. Auth0 authenticates and returns JWT tokens                      │
│     (access_token, id_token, refresh_token)                         │
│                    │                                                 │
│                    ▼                                                 │
│  5. Dashboard stores tokens, redirects to app                       │
│                    │                                                 │
│                    ▼                                                 │
│  6. API validates JWT on each request using Auth0 public keys       │
│                    │                                                 │
│                    ▼                                                 │
│  7. System creates/retrieves admin account using Auth0 user ID      │
│     (sub claim from JWT)                                            │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Multi-Tenant Data Isolation

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Multi-Tenant Architecture                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Administrator A                    Administrator B                  │
│  ┌─────────────────────┐           ┌─────────────────────┐          │
│  │ OAuth Account       │           │ OAuth Account       │          │
│  │ (Google: a@mail)    │           │ (GitHub: user_b)    │          │
│  └─────────┬───────────┘           └─────────┬───────────┘          │
│            │                                  │                      │
│            ▼                                  ▼                      │
│  ┌─────────────────────┐           ┌─────────────────────┐          │
│  │ Telegram Sessions   │           │ Telegram Sessions   │          │
│  │ • +1234567890       │           │ • +0987654321       │          │
│  └─────────┬───────────┘           └─────────┬───────────┘          │
│            │                                  │                      │
│            ▼                                  ▼                      │
│  ┌─────────────────────┐           ┌─────────────────────┐          │
│  │ Groups              │           │ Groups              │          │
│  │ • Gaming Squad      │           │ • Pro Gamers        │          │
│  │ • Casual Crew       │           │ • Weekend Warriors  │          │
│  │                     │           │                     │          │
│  │ Keywords, Commands  │           │ Keywords, Commands  │          │
│  │ (isolated)          │           │ (isolated)          │          │
│  └─────────────────────┘           └─────────────────────┘          │
│                                                                      │
│  ════════════════════════════════════════════════════════════════   │
│                    COMPLETE DATA ISOLATION                           │
│         Admin A cannot see or access Admin B's data                  │
│  ════════════════════════════════════════════════════════════════   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Steam Account Linking Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Steam Account Linking Flow                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. User in Telegram group sends: /linksteam                        │
│                    │                                                 │
│                    ▼                                                 │
│  2. Bot responds with unique link: https://bot.example/steam/link   │
│                    │                                                 │
│                    ▼                                                 │
│  3. User clicks link → Redirected to Steam OpenID login             │
│                    │                                                 │
│                    ▼                                                 │
│  4. User authenticates with Steam                                   │
│                    │                                                 │
│                    ▼                                                 │
│  5. Steam returns Steam ID to bot callback                          │
│                    │                                                 │
│                    ▼                                                 │
│  6. Bot stores: Telegram User ID ↔ Steam ID mapping                 │
│                    │                                                 │
│                    ▼                                                 │
│  7. Bot confirms in Telegram: "Steam account linked! ✓"             │
│                                                                      │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                      │
│  Stats Lookup (after linking):                                      │
│                                                                      │
│  User A: /stats @UserB cs2                                          │
│                    │                                                 │
│                    ▼                                                 │
│  Bot checks: Is UserB's Steam linked? → Yes                         │
│                    │                                                 │
│                    ▼                                                 │
│  Bot uses SYSTEM API KEY to fetch UserB's CS2 stats from Steam      │
│                    │                                                 │
│                    ▼                                                 │
│  Bot displays stats in group chat                                   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```
