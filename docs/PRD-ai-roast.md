# AI Roast Feature

## Overview

The `/roast` command allows group members to generate playful, AI-powered roasts of other users in the chat. This feature serves as a fun engagement driver and tests the OpenRouter AI integration hypothesis.

## User Flow

1. User A sends command in group chat: `/roast @username some context about them`
2. Bot parses the command, extracting:
   - Target username (Telegram mention)
   - User-provided prompt/context (optional, can be in any language)
3. Bot constructs an enhanced prompt for the AI provider
4. AI generates a roast in the same language as the user's request
5. Bot sends the roast as a reply in the group chat

## Command Format

```
/roast @username [level] [optional context]
```

### Roast Levels

| Level | Description | Tone |
|-------|-------------|------|
| `soft` | Light, friendly teasing | Gentle jokes, playful observations |
| `hard` | Standard roast intensity | Witty burns, clever insults |
| `extra` | Maximum roast power | Savage but still friendly, no holds barred |

**Default**: `hard` (if no level specified)

### Examples

```
/roast @alice hard always late to raids
/roast @bob extra his aim in CS:GO
/roast @charlie soft постоянно забывает про встречи
/roast @dave extra
/roast @eve                              # defaults to 'hard' level
/roast @frank some context               # defaults to 'hard' level
```

## Technical Requirements

### Input Parsing

- **Pattern**: `/roast @<username> [level] <optional_prompt>`
- **Username**: Telegram mention format (`@username`)
- **Level**: One of `soft`, `hard`, `extra` (case-insensitive, optional, defaults to `hard`)
- **Prompt**: Free-form text in any language, optional
- **Validation**:
  - Command must be sent in a registered group
  - Username must be valid Telegram mention
  - Level must be one of the three valid values (if provided)
  - Prompt length limit: 500 characters

### Prompt Engineering

The bot wraps the user's input in a system prompt to ensure quality and style. The prompt varies based on roast level:

```
System Prompt Template:
---
You are a witty roast master in a friendly gaming group chat. Generate a playful roast 
based on the context provided. The roast should be:

- {level_instructions}
- 2-3 sentences maximum
- In the same language as the user's request
- Focused on the provided context (if any)

Target: {username}
Context: {user_prompt}

Generate a roast:
---
```

#### Level-Specific Instructions

| Level | Instructions |
|-------|--------------|
| `soft` | "Light and gentle, like teasing a good friend. Keep it wholesome and avoid anything that could be taken the wrong way." |
| `hard` | "Humorous and creative, not mean-spirited or offensive. Witty burns that make everyone laugh." |
| `extra` | "Go all out with savage humor. Maximum roast energy while staying friendly. No mercy, but keep it fun." |

### AI Provider Integration

- **Provider**: OpenRouter
- **Model**: Configurable (default: fast, cost-effective model like `meta-llama/llama-3.1-8b-instruct`)
- **Parameters**:
  - `temperature`: 0.8 (creative but not random)
  - `max_tokens`: 150
  - `top_p`: 0.9

### Response Handling

- **Success**: Post roast as reply to the original command message
- **Error Handling**:
  - API timeout (5s): "The roast generator is taking a coffee break ☕"
  - Rate limit: "Too many roasts! Try again in a moment 🔥"
  - Invalid input: "Usage: `/roast @username [soft|hard|extra] [optional context]`"
  - Invalid level: "Invalid roast level! Use: soft, hard, or extra"
  - AI moderation filter triggered: "That roast was too spicy even for me 🌶️"

### Language Detection

The AI provider should automatically detect and respond in the language of the user's prompt. No explicit language detection needed — rely on the AI's multilingual capabilities.

## Architecture

### Components

```
pkg/bot/
├── connectors/
│   └── openrouter/
│       ├── client.ts           # OpenRouter HTTP client
│       ├── types.ts            # Request/response schemas (Zod)
│       └── prompts/
│           └── roast.ts        # System prompt template
├── services/
│   └── ai/
│       └── generate-roast.ts   # Use case: orchestrates roast generation
└── adapters/telegram/commands/
    └── fun.ts                  # /roast command definition
```

### Data Flow

```
Telegram Message
    ↓
TelegramRouter (parses command)
    ↓
GenerateRoast Use Case
    ↓
OpenRouterClient (API call)
    ↓
AI Response
    ↓
TelegramRouter (formats & sends reply)
```

## Configuration

Add to `local.config.json`:

```json
{
  "openrouter": {
    "apiKey": "sk-or-...",
    "baseUrl": "https://openrouter.ai/api/v1",
    "defaultModel": "meta-llama/llama-3.1-8b-instruct",
    "timeout": 5000,
    "maxRetries": 2
  },
  "ai": {
    "roast": {
      "enabled": true,
      "temperature": 0.8,
      "maxTokens": 150,
      "cooldownSeconds": 10
    }
  }
}
```

## Rate Limiting

- **Per User**: 5 roasts per minute
- **Per Group**: 20 roasts per minute
- **Global**: 100 roasts per minute (OpenRouter tier dependent)

Implement using in-memory cache (later: Redis).

## Security & Moderation

- No PII should be sent to OpenRouter beyond Telegram usernames
- System prompt includes guardrails against offensive content
- If AI response contains blocked words/patterns, replace with error message
- Group admins can disable the feature via `/settings roast off`

## Future Enhancements

- ~~Configurable roast intensity (mild/medium/spicy)~~ ✅ Implemented as levels
- Roast history/leaderboard ("most roasted user")
- Custom system prompts per group
- `/compliment` counterpart command
- Roast battles (two users roast each other)
- Per-group default roast level setting

## Success Metrics

- Command usage frequency
- User engagement (replies, reactions)
- Error rate (API failures, timeouts)
- Cost per roast (OpenRouter API costs)
- User feedback (via group admin reports)

## Related Documentation

- #[[file:docs/PRD-architecture.md]] - Clean Architecture patterns
- #[[file:docs/PRD-platform.md]] - Platform abstraction
- #[[file:.kiro/steering/telegram-router.md]] - Command routing
- #[[file:.kiro/steering/services.md]] - Use case pattern
