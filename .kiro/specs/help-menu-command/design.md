# Design Document

## Introduction

This document describes the technical design for the Help Menu Command feature. The feature provides users with a `/help` command that displays all available bot commands in a well-organized, categorized format. The design introduces a Command Registry pattern that allows commands to self-register their metadata, enabling automatic help menu generation.

## Design Overview

The help menu system consists of three main components:

1. **Command Registry** - A centralized store for command metadata that commands register with during initialization
2. **Help Command** - A special command that reads from the registry and formats the help menu
3. **Command Metadata** - A standardized structure for describing commands

The design follows the existing Telegram Router patterns, implementing the help command as a `CommandDefinition` that integrates seamlessly with the current architecture.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      TelegramRouter                              │
│  ┌─────────────────┐    ┌─────────────────┐                     │
│  │ Admin Commands  │    │  Help Command   │                     │
│  │ /register       │    │  /help          │──────┐              │
│  │ /status         │    └─────────────────┘      │              │
│  │ /delete_account │                             ▼              │
│  └────────┬────────┘                    ┌────────────────┐      │
│           │                             │ CommandRegistry│      │
│           └────────────────────────────►│                │      │
│                  registers metadata     │ - commands[]   │      │
│                                         │ - getAll()     │      │
│                                         │ - register()   │      │
│                                         └────────────────┘      │
└─────────────────────────────────────────────────────────────────┘
```

## Components

### 1. Command Metadata Schema

Location: `pkg/bot/adapters/telegram/types.ts`

```typescript
export const commandMetadataSchema = z.object({
  command: z.string().regex(/^\/\w+$/),
  description: z.string().min(1),
  usage: z.string().optional(),
  category: z.string().min(1),
  privateOnly: z.boolean().optional(),
});

export type CommandMetadata = z.infer<typeof commandMetadataSchema>;
```

**Design Decision**: Using Zod for the metadata schema ensures runtime validation and type safety, consistent with the project's existing patterns.

### 2. Command Registry

Location: `pkg/bot/adapters/telegram/command-registry.ts`

The Command Registry is a singleton that stores command metadata and provides methods for registration and retrieval.

```typescript
export class CommandRegistry {
  private commands: CommandMetadata[] = [];
  private categoryOrder: string[] = ["General", "Admin Commands", "Group Commands"];

  register(metadata: CommandMetadata): void;
  registerMany(metadata: CommandMetadata[]): void;
  getAll(): CommandMetadata[];
  getByCategory(): Map<string, CommandMetadata[]>;
  clear(): void;
}
```

**Design Decisions**:

1. **Singleton Pattern**: A single registry instance ensures all commands register to the same place. The registry is created and exported as a module-level instance.

2. **Category Ordering**: Categories are returned in a predefined order (`categoryOrder`), with any unlisted categories appended alphabetically. This ensures consistent help menu display.

3. **Clear Method**: Enables testing by allowing registry reset between tests.

### 3. Help Command Definition

Location: `pkg/bot/adapters/telegram/commands/help.ts`

The help command is implemented as a `CommandDefinition` that:
- Matches only `/help` (exact match, no arguments)
- Only responds in private chats
- Reads from the Command Registry
- Uses a list response type for formatted output

```typescript
export function createHelpCommand(registry: CommandRegistry): CommandDefinition<unknown, unknown> {
  return {
    pattern: /^\/help$/,
    useCase: {
      run: async () => {
        const commandsByCategory = registry.getByCategory();
        return {
          categories: Array.from(commandsByCategory.entries()).map(([category, commands]) => ({
            name: category,
            commands,
          })),
        };
      },
    },
    parseInput: (ctx: Context) => ({
      chatType: ctx.chat?.type,
    }),
    response: {
      type: "text",
      template: "...", // See Help Menu Format section
    },
  };
}
```

**Design Decision**: The help command uses an inline "use case" object rather than a full use case class because:
- It has no business logic requiring validation or permissions
- It only reads from an in-memory registry
- It doesn't interact with repositories or require transactions

### 4. Private Chat Filter

The help command should only respond in private chats. This is handled by checking `ctx.chat?.type` in the command's `parseInput` and returning early if not a private chat.

**Implementation Approach**: Add a `chatFilter` property to `CommandDefinition` that the router checks before executing:

```typescript
export type CommandDefinition<TInput, TResult> = {
  pattern: RegExp;
  chatFilter?: "private" | "group" | "all";  // New optional field
  useCase: {run: (input: TInput) => Promise<TResult>};
  // ... rest of definition
};
```

**Design Decision**: Adding `chatFilter` to `CommandDefinition` is cleaner than checking chat type inside each command's logic. It keeps the filtering declarative and consistent with the router's pattern-matching approach.

### 5. Help Menu Format

The help menu uses a custom formatting approach since the existing `list` response type doesn't support nested grouping (categories containing commands).

**Format Template**:
```
🤖 *Saimontoro Help*

Welcome! Here are the available commands:

*General*
`/help` — Show this help menu

*Admin Commands*
`/register` — Register as a bot admin
`/status` — View your account status
`/delete_account` — Delete your account

*Group Commands*
`/addgroup` — Add a group to manage
`/groups` — List your groups
```

**Design Decision**: Command names are formatted in monospace (backticks) for visual distinction, and category names are bold. This follows Telegram's Markdown formatting and makes the menu scannable.

### 6. Integration with Existing Commands

When creating admin commands (and future group/keyword commands), each command factory will also register metadata with the Command Registry:

```typescript
// In admin.ts
export function createAdminCommands(deps: Dependencies): CommandDefinition<unknown, unknown>[] {
  // Register metadata for help menu
  commandRegistry.registerMany([
    {
      command: "/register",
      description: "Register as a bot admin",
      category: "Admin Commands",
      privateOnly: true,
    },
    {
      command: "/status",
      description: "View your account status",
      category: "Admin Commands",
      privateOnly: true,
    },
    {
      command: "/delete_account",
      description: "Delete your account and all associated data",
      category: "Admin Commands",
      privateOnly: true,
    },
  ]);

  return [/* existing command definitions */];
}
```

**Design Decision**: Metadata registration happens in the same factory function that creates commands. This co-location ensures metadata stays in sync with actual command implementations.

## Data Models

### CommandMetadata

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| command | string | Yes | Command name including slash (e.g., "/help") |
| description | string | Yes | Brief description of what the command does |
| usage | string | No | Example usage pattern (e.g., "/keyword add <pattern>") |
| category | string | Yes | Category for grouping in help menu |
| privateOnly | boolean | No | If true, command only works in private chat |

### HelpMenuResult

The result type returned by the help command's use case:

```typescript
type HelpMenuResult = {
  categories: Array<{
    name: string;
    commands: CommandMetadata[];
  }>;
};
```

## Error Handling

The help command has minimal error scenarios:

1. **Empty Registry**: If no commands are registered, display a message indicating no commands are available (edge case during development)
2. **Non-Private Chat**: Command silently ignores messages in group chats (per Requirement 1.2)

No error response configuration is needed since the command doesn't interact with external systems or perform operations that can fail.

## Testing Strategy

### Unit Tests

1. **CommandRegistry**
   - `register()` adds command metadata
   - `registerMany()` adds multiple commands
   - `getAll()` returns all registered commands
   - `getByCategory()` groups commands correctly
   - `getByCategory()` respects category ordering
   - `clear()` removes all commands

2. **Help Command**
   - Returns formatted help menu with all registered commands
   - Groups commands by category
   - Includes command descriptions
   - Shows usage examples when provided
   - Handles empty registry gracefully

3. **Chat Filter**
   - Help command responds in private chat
   - Help command ignores group chats
   - Help command ignores supergroup chats

### Integration Tests

1. **Router Integration**
   - Help command registered and routable
   - `/help` pattern matches correctly
   - Response formatted correctly via router

## File Structure

```
pkg/bot/adapters/telegram/
├── command-registry.ts      # NEW: CommandRegistry class
├── commands/
│   ├── admin.ts             # MODIFIED: Add metadata registration
│   ├── help.ts              # NEW: Help command definition
│   └── index.ts             # MODIFIED: Export help command
├── router.ts                # MODIFIED: Add chatFilter support
├── types.ts                 # MODIFIED: Add CommandMetadata schema
└── ...
```

## Correctness Properties

### Property 1: Registry Completeness
All commands registered with the router that have associated metadata MUST appear in the help menu output.

**Validates: Requirement 2.3** - The Command_Registry SHALL return all registered commands in a consistent order.

### Property 2: Category Grouping Consistency
Commands with the same category MUST be grouped together in the help menu output.

**Validates: Requirement 2.4** - The Command_Registry SHALL allow grouping commands by category.

### Property 3: Private Chat Exclusivity
The help command MUST only produce output when invoked in a private chat context.

**Validates: Requirements 1.1, 1.2** - Help command responds in private chat, ignores group chats.

### Property 4: Metadata Structure Validity
All registered command metadata MUST conform to the CommandMetadata schema (required fields present, valid format).

**Validates: Requirement 4** - Command metadata structure requirements.

## Dependencies

- **grammy**: For Context type and chat type detection
- **zod**: For CommandMetadata schema validation
- Existing Telegram Router infrastructure

## Migration Notes

This feature is additive and doesn't require changes to existing data or breaking changes to the API. Existing commands will need to be updated to register their metadata, but this can be done incrementally.
