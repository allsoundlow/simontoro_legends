# OpenRouter Power

Access 300+ AI models through a unified API with the OpenRouter SDK.

## Overview

This power provides guidance and patterns for integrating OpenRouter into your applications. OpenRouter offers:

- **Unified API** - Access Claude, GPT-4, Gemini, Llama, and 300+ models through one interface
- **Automatic Routing** - Use `openrouter/auto` for intelligent model selection
- **Items-Based Streaming** - Modern streaming pattern with progressive item updates
- **Tool Calling** - Built-in support for function/tool execution

## Quick Start

### Installation

```bash
npm install @openrouter/sdk zod eventemitter3
```

### Basic Usage

```typescript
import { OpenRouter } from '@openrouter/sdk';

const client = new OpenRouter({ 
  apiKey: process.env.OPENROUTER_API_KEY 
});

const result = client.callModel({
  model: 'openrouter/auto',
  input: [{ role: 'user', content: 'Hello!' }],
});

const response = await result.getText();
```

## Key Concepts

### Items-Based Streaming

OpenRouter uses an items-based streaming model where items are emitted multiple times with the same ID but progressively updated content. **Replace items by ID, don't accumulate chunks.**

```typescript
const items = new Map<string, StreamableOutputItem>();

for await (const item of result.getItemsStream()) {
  items.set(item.id, item);  // Replace by ID
}
```

### Item Types

| Type | Purpose |
|------|---------|
| `message` | Assistant text responses |
| `function_call` | Tool invocations with streaming arguments |
| `function_call_output` | Results from executed tools |
| `reasoning` | Extended thinking content |

### Tool Definition

```typescript
import { tool } from '@openrouter/sdk';
import { z } from 'zod';

const myTool = tool({
  name: 'get_weather',
  description: 'Get current weather for a location',
  inputSchema: z.object({
    location: z.string().describe('City name'),
  }),
  execute: async ({ location }) => {
    return { temperature: 72, condition: 'sunny' };
  },
});
```

## Model Discovery

**Never hardcode model IDs** - use the models API:

```typescript
const res = await fetch('https://openrouter.ai/api/v1/models');
const { data: models } = await res.json();

// Find Claude models
const claudeModels = models.filter(m => m.id.startsWith('anthropic/'));
```

## Resources

- [OpenRouter Docs](https://openrouter.ai/docs)
- [Models API](https://openrouter.ai/api/v1/models)
- [Get API Key](https://openrouter.ai/settings/keys)
- [Browse Models](https://openrouter.ai/models)

## Security

⚠️ **Never commit API keys.** Use environment variables:

```bash
export OPENROUTER_API_KEY=sk-or-...
```
