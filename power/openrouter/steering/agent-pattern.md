# Building a Modular AI Agent

This guide walks through creating a standalone agent with hooks, extensible architecture, and optional UI integration.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Your Application                 │
├─────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │   Ink TUI   │  │  HTTP API   │  │   Discord   │  │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  │
│         │                │                │         │
│         └────────────────┼────────────────┘         │
│                          ▼                          │
│              ┌───────────────────────┐              │
│              │      Agent Core       │              │
│              │  (hooks & lifecycle)  │              │
│              └───────────┬───────────┘              │
│                          ▼                          │
│              ┌───────────────────────┐              │
│              │    OpenRouter SDK     │              │
│              └───────────────────────┘              │
└─────────────────────────────────────────────────────┘
```

## Agent Core Implementation

```typescript
import { OpenRouter, tool, stepCountIs } from '@openrouter/sdk';
import type { Tool, StreamableOutputItem } from '@openrouter/sdk';
import { EventEmitter } from 'eventemitter3';
import { z } from 'zod';

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AgentEvents {
  'message:user': (message: Message) => void;
  'message:assistant': (message: Message) => void;
  'item:update': (item: StreamableOutputItem) => void;
  'stream:start': () => void;
  'stream:delta': (delta: string, accumulated: string) => void;
  'stream:end': (fullText: string) => void;
  'tool:call': (name: string, args: unknown) => void;
  'tool:result': (name: string, result: unknown) => void;
  'reasoning:update': (text: string) => void;
  'error': (error: Error) => void;
  'thinking:start': () => void;
  'thinking:end': () => void;
}

export interface AgentConfig {
  apiKey: string;
  model?: string;
  instructions?: string;
  tools?: Tool<z.ZodTypeAny, z.ZodTypeAny>[];
  maxSteps?: number;
}

export class Agent extends EventEmitter<AgentEvents> {
  private client: OpenRouter;
  private messages: Message[] = [];
  private config: Required<Omit<AgentConfig, 'apiKey'>> & { apiKey: string };

  constructor(config: AgentConfig) {
    super();
    this.client = new OpenRouter({ apiKey: config.apiKey });
    this.config = {
      apiKey: config.apiKey,
      model: config.model ?? 'openrouter/auto',
      instructions: config.instructions ?? 'You are a helpful assistant.',
      tools: config.tools ?? [],
      maxSteps: config.maxSteps ?? 5,
    };
  }

  getMessages(): Message[] {
    return [...this.messages];
  }

  clearHistory(): void {
    this.messages = [];
  }

  setInstructions(instructions: string): void {
    this.config.instructions = instructions;
  }

  addTool(newTool: Tool<z.ZodTypeAny, z.ZodTypeAny>): void {
    this.config.tools.push(newTool);
  }

  async send(content: string): Promise<string> {
    const userMessage: Message = { role: 'user', content };
    this.messages.push(userMessage);
    this.emit('message:user', userMessage);
    this.emit('thinking:start');

    try {
      const result = this.client.callModel({
        model: this.config.model,
        instructions: this.config.instructions,
        input: this.messages.map((m) => ({ role: m.role, content: m.content })),
        tools: this.config.tools.length > 0 ? this.config.tools : undefined,
        stopWhen: [stepCountIs(this.config.maxSteps)],
      });

      this.emit('stream:start');
      let fullText = '';

      for await (const item of result.getItemsStream()) {
        this.emit('item:update', item);

        switch (item.type) {
          case 'message':
            const textContent = item.content?.find((c: { type: string }) => c.type === 'output_text');
            if (textContent && 'text' in textContent) {
              const newText = textContent.text;
              if (newText !== fullText) {
                const delta = newText.slice(fullText.length);
                fullText = newText;
                this.emit('stream:delta', delta, fullText);
              }
            }
            break;
          case 'function_call':
            if (item.status === 'completed') {
              this.emit('tool:call', item.name, JSON.parse(item.arguments || '{}'));
            }
            break;
          case 'function_call_output':
            this.emit('tool:result', item.callId, item.output);
            break;
          case 'reasoning':
            const reasoningText = item.content?.find((c: { type: string }) => c.type === 'reasoning_text');
            if (reasoningText && 'text' in reasoningText) {
              this.emit('reasoning:update', reasoningText.text);
            }
            break;
        }
      }

      if (!fullText) {
        fullText = await result.getText();
      }

      this.emit('stream:end', fullText);

      const assistantMessage: Message = { role: 'assistant', content: fullText };
      this.messages.push(assistantMessage);
      this.emit('message:assistant', assistantMessage);

      return fullText;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.emit('error', error);
      throw error;
    } finally {
      this.emit('thinking:end');
    }
  }

  async sendSync(content: string): Promise<string> {
    const userMessage: Message = { role: 'user', content };
    this.messages.push(userMessage);
    this.emit('message:user', userMessage);

    try {
      const result = this.client.callModel({
        model: this.config.model,
        instructions: this.config.instructions,
        input: this.messages.map((m) => ({ role: m.role, content: m.content })),
        tools: this.config.tools.length > 0 ? this.config.tools : undefined,
        stopWhen: [stepCountIs(this.config.maxSteps)],
      });

      const fullText = await result.getText();
      const assistantMessage: Message = { role: 'assistant', content: fullText };
      this.messages.push(assistantMessage);
      this.emit('message:assistant', assistantMessage);

      return fullText;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.emit('error', error);
      throw error;
    }
  }
}

export function createAgent(config: AgentConfig): Agent {
  return new Agent(config);
}
```

## Using the Agent

### With Event Hooks

```typescript
const agent = createAgent({
  apiKey: process.env.OPENROUTER_API_KEY!,
  model: 'openrouter/auto',
  instructions: 'You are a helpful assistant.',
});

agent.on('thinking:start', () => console.log('🤔 Thinking...'));
agent.on('tool:call', (name, args) => console.log(`🔧 ${name}:`, args));
agent.on('stream:delta', (delta) => process.stdout.write(delta));
agent.on('error', (err) => console.error('❌', err.message));

await agent.send('What time is it?');
```

### With HTTP Server

```typescript
import express from 'express';

const app = express();
const sessions = new Map<string, Agent>();

app.post('/chat', async (req, res) => {
  const { sessionId, message } = req.body;
  
  let agent = sessions.get(sessionId);
  if (!agent) {
    agent = createAgent({ apiKey: process.env.OPENROUTER_API_KEY! });
    sessions.set(sessionId, agent);
  }
  
  const response = await agent.sendSync(message);
  res.json({ response, history: agent.getMessages() });
});
```

## Agent API Reference

### Constructor Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| apiKey | string | required | OpenRouter API key |
| model | string | 'openrouter/auto' | Model to use |
| instructions | string | 'You are a helpful assistant.' | System prompt |
| tools | Tool[] | [] | Available tools |
| maxSteps | number | 5 | Max agentic loop iterations |

### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `send(content)` | Promise<string> | Send with streaming |
| `sendSync(content)` | Promise<string> | Send without streaming |
| `getMessages()` | Message[] | Get conversation history |
| `clearHistory()` | void | Clear conversation |
| `setInstructions(text)` | void | Update system prompt |
| `addTool(tool)` | void | Add tool at runtime |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `message:user` | Message | User message added |
| `message:assistant` | Message | Assistant response complete |
| `item:update` | StreamableOutputItem | Item emitted (replace by ID) |
| `stream:start` | - | Streaming started |
| `stream:delta` | (delta, accumulated) | New text chunk |
| `stream:end` | fullText | Streaming complete |
| `tool:call` | (name, args) | Tool being called |
| `tool:result` | (name, result) | Tool returned result |
| `reasoning:update` | text | Extended thinking content |
| `thinking:start` | - | Agent processing |
| `thinking:end` | - | Agent done processing |
| `error` | Error | Error occurred |
