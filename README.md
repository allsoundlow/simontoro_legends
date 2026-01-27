# 🤖 Saimontoro

> A multi-tenant gaming group chatbot built with AI-assisted development — exploring spec-driven workflows, steering rules, and agentic automation.

[![AI-Assisted](https://img.shields.io/badge/AI-Assisted%20Development-purple)](https://github.com/topics/ai-assisted)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22+-green)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

## What is this?

Saimontoro is a gaming group chatbot designed for friend gaming communities. But more than that, it's a **case study in AI-assisted software development** — built primarily through human-AI collaboration using a spec-driven approach.

### The Product

- **Keyword notifications** — Get pinged when someone mentions game names, raid calls, or events
- **Game stats lookup** — Steam integration for player statistics (PSN/Xbox planned)
- **Custom commands** — Group-defined commands with variable substitution
- **Multi-tenant** — Each gaming community manages their own bot configuration
- **Multi-platform** — Telegram (Phase 1), Discord (Phase 2)

### The Experiment

This repo demonstrates how AI agents can be guided through complex software development using:

- **Specs** — Structured requirements → design → implementation workflows
- **Steering rules** — Persistent context that guides AI behavior across the codebase
- **Hooks** — Automated agent actions triggered by IDE events

**Use your preferred AI assistant** — The patterns here work with any AI coding tool (Cursor, Copilot, Claude, Kiro, Windsurf, etc.). The steering files and specs are just markdown that any AI can consume.

## AI-Assisted Development Workflow

### 📋 Specs: From Requirements to Code

Specs formalize the design process. Each feature goes through three phases:

```
.kiro/specs/keyword-notification-api/
├── requirements.md   # User stories and acceptance criteria
├── design.md         # Architecture, schemas, interfaces
└── tasks.md          # Implementation checklist with requirement tracing
```

The AI iterates with you on each phase, then works through implementation tasks systematically. Every task links back to specific requirements for traceability.

### 🎯 Steering Rules: Persistent AI Context

Steering files in `.kiro/steering/` provide always-on guidance:

```
.kiro/steering/
├── architecture.md   # Layered architecture, dependency flow
├── code-style.md     # TypeScript conventions, naming
├── database.md       # Kysely patterns, migrations
├── fastify.md        # Route patterns, validation
├── testing.md        # Test framework, patterns
└── zod.md            # Schema conventions
```

These rules are automatically included in AI context, ensuring consistent patterns across the entire codebase without repeating instructions.

### ⚡ Hooks: Automated Agent Actions

Hooks trigger AI actions on IDE events:

```json
{
  "name": "Lint on Save",
  "when": {"type": "fileEdited", "patterns": ["**/*.ts"]},
  "then": {
    "type": "askAgent",
    "prompt": "Run `yarn eslint --fix` on the saved file..."
  }
}
```

Current hooks include:
- **Lint on Save** — Auto-fix linting issues when TypeScript files are saved
- **Validate Zod Schema** — Check schema conventions when schema files change
- **Sync Tests** — Remind to update tests when route handlers change
- **Validate Config** — Verify config files match Zod schemas

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js 22+ |
| Language | TypeScript (strict mode) |
| HTTP Framework | Fastify |
| Validation | Zod (with OpenAPI generation) |
| Database | PostgreSQL + Kysely |
| Caching | Redis |
| Logging | Pino |
| Chat Platforms | Telegram (grammy), Discord (discord.js) |

## Project Structure

```
/
├── .kiro/
│   ├── specs/          # Feature specifications
│   ├── steering/       # AI guidance rules
│   └── hooks/          # Automated agent triggers
├── docs/               # PRD documentation
│   ├── PRD-overview.md
│   ├── PRD-architecture.md
│   └── ...
├── pkg/
│   └── bot/            # Main server application
│       ├── routes/     # Fastify API routes
│       ├── services/   # Business logic
│       ├── repositories/  # Data access
│       ├── schemas/    # Zod schemas
│       └── tests/      # Test suites
└── docker-compose.yml  # Local infrastructure
```

## Getting Started

### Prerequisites

- Node.js 22+
- Yarn
- Docker & Docker Compose

### Setup

1. **Clone and install dependencies**
   ```bash
   git clone https://github.com/yourusername/saimontoro.git
   cd saimontoro
   yarn install
   ```

2. **Start infrastructure**
   ```bash
   cp .env.example .env
   docker compose up -d
   ```

3. **Configure the bot**
   ```bash
   cd pkg/bot
   cp local.config.json.example local.config.json
   # Edit local.config.json with your settings
   ```

4. **Run the development server**
   ```bash
   yarn dev
   ```

### Running Tests

```bash
cd pkg/bot
yarn test
```

## Documentation

Detailed requirements are split across domain-specific PRD documents:

| Document | Description |
|----------|-------------|
| [PRD-overview.md](docs/PRD-overview.md) | Introduction, glossary, document index |
| [PRD-architecture.md](docs/PRD-architecture.md) | System architecture and principles |
| [PRD-tech-stack.md](docs/PRD-tech-stack.md) | Technology choices and configuration |
| [PRD-core-features.md](docs/PRD-core-features.md) | Keywords, stats, custom commands |
| [PRD-auth.md](docs/PRD-auth.md) | Authentication and multi-tenancy |
| [PRD-platform.md](docs/PRD-platform.md) | Chat platform integration |
| [PRD-infrastructure.md](docs/PRD-infrastructure.md) | Persistence, logging, monitoring |

## Development Philosophy

This project embraces a few key ideas:

1. **Documentation-first** — PRDs inform implementation, not the other way around
2. **Spec-driven development** — Features are designed before they're built
3. **AI as collaborator** — The AI follows steering rules and works through specs systematically
4. **Traceability** — Every implementation task links to requirements

## Contributing

This is primarily an experimental project exploring AI-assisted development. If you're interested in the approach:

1. Check out the `.kiro/` folder to see how specs and steering work
2. Read through a spec to understand the workflow
3. Open an issue to discuss ideas

## License

MIT

---

*Built with [Kiro](https://kiro.dev) — an AI-native IDE for spec-driven development*
