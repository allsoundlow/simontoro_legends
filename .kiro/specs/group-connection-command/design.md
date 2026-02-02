# Design Document: Group Connection Command

## Overview

This design describes the implementation of the `/connect_group` command for the Telegram bot. The command allows registered admins to connect Telegram groups to the bot by executing the command directly in a group chat. The implementation follows the existing TelegramRouter pattern with declarative command definitions.

## Architecture

The feature integrates into the existing layered architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                    Telegram Adapter Layer                    │
│  ┌─────────────────┐    ┌──────────────────────────────┐   │
│  │ TelegramRouter  │───▶│ CommandDefinition            │   │
│  │                 │    │ - pattern: /^\/connect_group$/│   │
│  │                 │    │ - chatFilter: "group"        │   │
│  │                 │    │ - parseInput()               │   │
│  │                 │    │ - response config            │   │
│  └─────────────────┘    └──────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Use Case Layer                            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Register (existing)                                   │   │
│  │ - Input: adminTelegramId, telegramGroupId, groupName │   │
│  │ - Output: Group entity                               │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Repository Layer                          │
│  ┌────────────────────┐    ┌────────────────────┐          │
│  │ AdminRepository    │    │ GroupRepository    │          │
│  └────────────────────┘    └────────────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Group Command Definitions Factory

A new factory function `createGroupCommands` will be added to `pkg/bot/adapters/telegram/commands/group.ts`:

```typescript
import type {Context} from "grammy";
import {Register} from "../../../services/group";
import type {Dependencies} from "../../../services/base";
import {commandRegistry} from "../command-registry";
import type {CommandDefinition} from "../types";

type ConnectGroupInput = {
  adminTelegramId: string;
  telegramGroupId: string;
  groupName: string;
};

export function createGroupCommands(deps: Dependencies): CommandDefinition<unknown, unknown>[] {
  // Register metadata for help menu
  commandRegistry.register({
    command: "/connect_group",
    description: "Connect this group to the bot",
    category: "Group Commands",
  });

  return [
    {
      pattern: /^\/connect_group$/,
      chatFilter: "group",
      useCase: new Register(deps),
      parseInput: (ctx: Context): ConnectGroupInput => ({
        adminTelegramId: String(ctx.from!.id),
        telegramGroupId: String(ctx.chat!.id),
        groupName: ctx.chat!.title ?? "Unnamed Group",
      }),
      response: {
        type: "text",
        template: "🎉 *{{group_name}}* is now connected!\n\nI can help with:\n• Keyword notifications\n• Game stats lookup\n• Custom commands\n\nUse /help for more info.",
      },
      errorResponse: {
        mappings: [
          {
            errorType: "NotFoundError",
            template: "You need to register first. Send /register to me in a private chat.",
          },
          {
            errorType: "ConflictError", 
            template: "This group is already connected! 👍",
          },
        ],
        defaultTemplate: "Failed to connect group: {{message}}",
      },
    },
  ] as CommandDefinition<unknown, unknown>[];
}
```

### 2. Command Registration

The group commands will be registered in the Telegram plugin alongside existing admin commands:

```typescript
// In pkg/bot/plugins/telegram.ts
import {createGroupCommands} from "../adapters/telegram/commands/group";

// During router setup
const groupCommands = createGroupCommands(deps);
router.register(...groupCommands);
```

### 3. Input Extraction

The `parseInput` function extracts data from the grammY Context:

| Field | Source | Transformation |
|-------|--------|----------------|
| `adminTelegramId` | `ctx.from.id` | Convert to string |
| `telegramGroupId` | `ctx.chat.id` | Convert to string |
| `groupName` | `ctx.chat.title` | Use as-is, fallback to "Unnamed Group" |

### 4. Chat Filter Behavior

The `chatFilter: "group"` option ensures:
- Command is ignored in private chats (no response)
- Command works in both `group` and `supergroup` chat types
- Handled by existing `matchesChatFilter` method in TelegramRouter

## Data Models

### Input Schema (existing in Register use case)

```typescript
const inputSchema = z.object({
  adminTelegramId: z.string(),
  telegramGroupId: z.string(),
  groupName: z.string(),
});
```

### Output (Group entity)

```typescript
type Group = {
  pk: number;
  telegram_group_id: string;
  group_name: string;
  admin_pk: number;
  status: "active" | "inactive" | "bot_removed";
  created_at: string;
  updated_at: string;
};
```

### Command Metadata

```typescript
{
  command: "/connect_group",
  description: "Connect this group to the bot",
  category: "Group Commands",
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*



Based on the prework analysis, the following properties are testable:

### Property 1: Private Chat Filter

*For any* Telegram context representing a private chat, when the `/connect_group` command is matched, the router SHALL NOT process the command (no use case execution, no response).

**Validates: Requirements 1.1**

### Property 2: Group Chat Processing

*For any* Telegram context representing a group or supergroup chat with a valid user, when the `/connect_group` command is matched, the router SHALL process the command and execute the use case.

**Validates: Requirements 1.2**

### Property 3: Input Extraction Correctness

*For any* valid group chat context with numeric `chat.id`, `from.id`, and string `chat.title`, the `parseInput` function SHALL return an object with:
- `telegramGroupId` as a string representation of `chat.id`
- `adminTelegramId` as a string representation of `from.id`  
- `groupName` equal to `chat.title` (or "Unnamed Group" if title is undefined)

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

### Property 4: Success Response Contains Group Name

*For any* successful use case result containing a `group_name` field, the formatted response message SHALL contain that group name.

**Validates: Requirements 3.2, 4.2**

### Property 5: NotFoundError Mapping

*For any* error of type `NotFoundError`, the formatted error response SHALL contain instructions to register via `/register` in private chat.

**Validates: Requirements 5.1**

### Property 6: ConflictError Mapping

*For any* error of type `ConflictError`, the formatted error response SHALL indicate the group is already connected.

**Validates: Requirements 5.2**

### Property 7: Default Error Handling

*For any* error type not explicitly mapped (not `NotFoundError` or `ConflictError`), the formatted error response SHALL use the default template with the error message.

**Validates: Requirements 5.3**

## Error Handling

### Error Flow

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ TelegramRouter  │────▶│ Register UseCase │────▶│ Error Response  │
│ handleMessage() │     │ execute()        │     │ Formatter       │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                              │
                              ▼
                    ┌──────────────────────┐
                    │ Possible Errors:     │
                    │ - NotFoundError      │
                    │   (admin not found)  │
                    │ - ConflictError      │
                    │   (group exists)     │
                    │ - Unexpected errors  │
                    └──────────────────────┘
```

### Error Mappings

| Error Type | Template | User Action |
|------------|----------|-------------|
| `NotFoundError` | "You need to register first. Send /register to me in a private chat." | Register as admin |
| `ConflictError` | "This group is already connected! 👍" | None needed |
| Default | "Failed to connect group: {{message}}" | Contact support |

## Testing Strategy

### Unit Tests

Unit tests should cover:
- `parseInput` function extracts correct values from context
- Command metadata is registered correctly
- Error response mappings are configured correctly

### Integration Tests

Integration tests should verify:
- End-to-end flow from command to response in group chat
- Command is ignored in private chat
- Error responses are sent correctly
