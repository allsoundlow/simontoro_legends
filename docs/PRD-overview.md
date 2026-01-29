# Product Requirements Document: Gaming Group Chatbot

## Introduction

This document defines the product requirements for a gaming group chatbot designed for friends gaming groups, with **Telegram as the primary platform** (Discord support planned for Phase 2). The chatbot enhances the group's gaming experience by providing keyword notifications, game statistics lookup, custom group commands, and seamless integration with gaming platforms.

The system is **multi-tenant** — any person can register as an administrator, create their own group configuration, and manage their bot settings independently. Each administrator has access only to their own groups, ensuring complete isolation between different gaming communities.

The focus is on **group-centric functionality** — features that benefit the gaming community as a whole rather than individual user management.

**All group configuration is done directly through Telegram bot commands** — no separate admin dashboard is required. Administrators register via the bot and manage everything through chat commands.

## Platform Priority

1. **Phase 1 (MVP)**: Telegram — primary platform, full feature support
2. **Phase 2**: Discord — secondary platform, feature parity with Telegram

## Document Index

- [PRD-overview.md](./PRD-overview.md) — Introduction, platform priority, glossary (this file)
- [PRD-tech-stack.md](./PRD-tech-stack.md) — Tech stack, repository structure, configuration
- [PRD-architecture.md](./PRD-architecture.md) — Architecture diagrams, principles, layers
- [PRD-auth.md](./PRD-auth.md) — Multi-tenant, Telegram account connection, Steam linking
- [PRD-core-features.md](./PRD-core-features.md) — Keywords, stats, custom commands
- [PRD-platform.md](./PRD-platform.md) — Platform integration & message abstraction
- [PRD-infrastructure.md](./PRD-infrastructure.md) — Persistence, logging, monitoring
- [PRD-commands.md](./PRD-commands.md) — Command parsing, group administration

## Glossary

- **Bot**: The gaming group chatbot application that processes group messages and provides automated responses
- **Keyword_Watcher**: The component responsible for monitoring group chat messages for configured keywords
- **Notification_Service**: The service that delivers alerts to the same channel where the keyword was mentioned
- **Platform_Connector**: An integration module that connects to external gaming platforms (Steam, etc.)
- **Gaming_Platform_Connector**: Specifically for Steam/PSN/Xbox integrations where users link their accounts
- **Command_Handler**: The component that parses and routes commands to appropriate handlers
- **Group_Config**: The configuration settings for the bot within a specific group
- **Custom_Command**: A group-defined command with a trigger and response template
- **Administrator**: A registered user who manages one or more group configurations (isolated from other admins), authenticated via their Telegram account
- **Telegram_Account**: The administrator's Telegram account connected to the system for authentication and group management
