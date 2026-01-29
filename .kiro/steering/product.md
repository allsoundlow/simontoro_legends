# Product Overview

> Related PRD: #[[file:docs/PRD-overview.md]]

Saimontoro is a multi-tenant gaming group chatbot designed for friend gaming communities.

## Core Purpose
- Enhance gaming group experience through keyword notifications, game statistics lookup, and custom commands
- Multi-tenant architecture where administrators can register, create groups, and manage bot settings independently
- Group-centric functionality benefiting the gaming community as a whole

## Platform Strategy
- **Phase 1 (MVP)**: Telegram as primary platform with full feature support
- **Phase 2**: Discord with feature parity

## Key Features
- Keyword notification system for highlighting important topics (game names, events, raid calls)
- Game statistics lookup with Steam integration (PSN/Xbox planned)
- Custom group commands with variable substitution
- Platform abstraction layer for multi-platform support

## Administration Model
- All configuration done via Telegram bot commands — no separate admin dashboard
- Administrators register via `/register` command in private chat
- Telegram user ID used as unique identifier — no separate login required
- Group admin status verified via Telegram API for configuration commands
