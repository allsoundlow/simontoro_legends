# Defining Tools for OpenRouter

Tools allow your AI agent to perform actions and retrieve information. This guide covers tool definition patterns.

## Basic Tool Definition

```typescript
import { tool } from '@openrouter/sdk';
import { z } from 'zod';

export const timeTool = tool({
  name: 'get_current_time',
  description: 'Get the current date and time',
  inputSchema: z.object({
    timezone: z.string().optional().describe('Timezone (e.g., "UTC", "America/New_York")'),
  }),
  execute: async ({ timezone }) => {
    return {
      time: new Date().toLocaleString('en-US', { timeZone: timezone || 'UTC' }),
      timezone: timezone || 'UTC',
    };
  },
});
```

## Tool Structure

| Property | Type | Description |
|----------|------|-------------|
| `name` | string | Unique identifier for the tool |
| `description` | string | What the tool does (shown to model) |
| `inputSchema` | ZodSchema | Zod schema defining parameters |
| `execute` | function | Async function that runs the tool |

## Input Schema Best Practices

### Use Descriptive Field Descriptions

```typescript
const searchTool = tool({
  name: 'search_database',
  description: 'Search the product database',
  inputSchema: z.object({
    query: z.string().describe('Search query text'),
    category: z.enum(['electronics', 'clothing', 'home'])
      .optional()
      .describe('Filter by product category'),
    maxResults: z.number()
      .min(1)
      .max(100)
      .default(10)
      .describe('Maximum number of results to return'),
  }),
  execute: async ({ query, category, maxResults }) => {
    // Implementation
  },
});
```

### Complex Input Types

```typescript
const createOrderTool = tool({
  name: 'create_order',
  description: 'Create a new order with multiple items',
  inputSchema: z.object({
    customerId: z.string().uuid().describe('Customer UUID'),
    items: z.array(z.object({
      productId: z.string(),
      quantity: z.number().positive(),
    })).min(1).describe('Order items'),
    shippingAddress: z.object({
      street: z.string(),
      city: z.string(),
      country: z.string(),
      postalCode: z.string(),
    }).describe('Shipping address'),
  }),
  execute: async ({ customerId, items, shippingAddress }) => {
    // Implementation
  },
});
```

## Tool Categories

### Information Retrieval

```typescript
const weatherTool = tool({
  name: 'get_weather',
  description: 'Get current weather for a location',
  inputSchema: z.object({
    location: z.string().describe('City name or coordinates'),
    units: z.enum(['metric', 'imperial']).default('metric'),
  }),
  execute: async ({ location, units }) => {
    const response = await fetch(`https://api.weather.com/...`);
    return response.json();
  },
});
```

### Calculations

```typescript
const calculatorTool = tool({
  name: 'calculate',
  description: 'Perform mathematical calculations',
  inputSchema: z.object({
    expression: z.string().describe('Math expression (e.g., "2 + 2", "sqrt(16)")'),
  }),
  execute: async ({ expression }) => {
    // Safe evaluation
    const sanitized = expression.replace(/[^0-9+\-*/().\s]/g, '');
    const result = Function(`"use strict"; return (${sanitized})`)();
    return { expression, result };
  },
});
```

### Database Operations

```typescript
const queryDatabaseTool = tool({
  name: 'query_database',
  description: 'Execute a read-only database query',
  inputSchema: z.object({
    table: z.enum(['users', 'orders', 'products']),
    filters: z.record(z.string()).optional(),
    limit: z.number().max(100).default(10),
  }),
  execute: async ({ table, filters, limit }) => {
    // Use your database client
    const results = await db.select(table, filters, limit);
    return { count: results.length, data: results };
  },
});
```

### External API Calls

```typescript
const sendEmailTool = tool({
  name: 'send_email',
  description: 'Send an email to a recipient',
  inputSchema: z.object({
    to: z.string().email(),
    subject: z.string().max(200),
    body: z.string().max(10000),
  }),
  execute: async ({ to, subject, body }) => {
    await emailService.send({ to, subject, body });
    return { success: true, sentAt: new Date().toISOString() };
  },
});
```

## Error Handling in Tools

```typescript
const riskyTool = tool({
  name: 'risky_operation',
  description: 'An operation that might fail',
  inputSchema: z.object({
    input: z.string(),
  }),
  execute: async ({ input }) => {
    try {
      const result = await performRiskyOperation(input);
      return { success: true, result };
    } catch (error) {
      // Return error info instead of throwing
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  },
});
```

## Registering Tools with Agent

```typescript
import { createAgent } from './agent';
import { timeTool, calculatorTool, weatherTool } from './tools';

const agent = createAgent({
  apiKey: process.env.OPENROUTER_API_KEY!,
  tools: [timeTool, calculatorTool, weatherTool],
});

// Add tools at runtime
agent.addTool(customTool);
```

## Tool Execution Flow

1. Model decides to call a tool based on user input
2. SDK validates arguments against `inputSchema`
3. `execute` function runs with validated arguments
4. Result is returned to the model
5. Model incorporates result into response

## Security Considerations

- **Validate all inputs** - Zod schemas provide runtime validation
- **Limit scope** - Tools should do one thing well
- **Sanitize outputs** - Don't expose sensitive data in tool results
- **Rate limit** - Implement rate limiting for expensive operations
- **Audit logging** - Log tool calls for debugging and security
