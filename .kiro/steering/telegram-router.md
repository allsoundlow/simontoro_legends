# Telegram Router Pattern

> Related: #[[file:docs/PRD-architecture.md]] (Declarative Command Routing), #[[file:docs/PRD-platform.md]] (Message Platform Abstraction)

Declarative command-to-use-case mapping for Telegram. Commands are data structures, not imperative handlers.

## File Structure

```
pkg/bot/adapters/telegram/
├── router.ts              # TelegramRouter class
├── types.ts               # Types and Zod schemas
├── response-formatter.ts  # Response formatting
├── template.ts            # {{field}} interpolation
├── commands/*.ts          # Command definitions by domain
└── index.ts               # Public exports
```

## Command Definition

```typescript
{
  pattern: /^\/register$/,           // RegExp matching message text
  useCase: new Register(deps),       // Use case with run() method
  parseInput: (ctx) => ({...}),      // Extract input from grammY context
  response: {type: "text", template: "Welcome, {{telegram_username}}!"},
  errorResponse: {                   // Optional
    mappings: [{errorType: "ConflictError", template: "Already registered!"}],
    defaultTemplate: "Failed: {{message}}",
  },
}
```

## Response Types

- `text` — Simple template message
- `text_with_keyboard` — Template + inline keyboard buttons
- `list` — Header template + itemTemplate for arrays, with emptyMessage fallback
- `silent` — No response sent

## Template Interpolation

- `{{field}}` — Simple field access
- `{{admin.telegram_username}}` — Dot notation for nested access
- Null/undefined → empty string

## Error Handling

Match by error constructor name (`NotFoundError`, `ConflictError`). Use `{{message}}` to include `error.message`. Unmatched errors use `defaultTemplate`.

## Adding Commands

Group by domain in `commands/` using factory functions:

```typescript
export function createAdminCommands(deps: Dependencies): CommandDefinition<unknown, unknown>[] {
  return [/* command definitions */];
}
```

Pass to router via constructor `commands` option or `router.register()`.
