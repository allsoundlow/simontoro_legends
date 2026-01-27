# Fastify Patterns

> Related PRD: #[[file:docs/PRD-architecture.md]] (API Layer), #[[file:docs/PRD-infrastructure.md]] (Requirement 9: Logging)

## Route Registration
- Use Fastify plugins for modular route registration
- Group related routes in a single file under `routes/`
- Register plugins with a prefix for namespacing

```typescript
// routes/example.ts
import {FastifyInstance} from "fastify";

export default function exampleRoutes(fastify: FastifyInstance) {
  fastify.route({
    url: "/endpoint",
    method: "POST",
    handler: async function handlerName({log, body}) {
      // handler logic
    },
  });
}
```

```typescript
// app.ts - registration
fastify.register(exampleRoutes, {prefix: "/api/v1/"});
```

## Route Handlers
- Use named handler functions for better stack traces
- Destructure request properties (`{log, body, params, query}`)
- Return data directly - Fastify handles serialization
- Use `async/await` for all handlers

## Validation with Zod
- Define Zod schemas for request body, params, and query
- Use `@fastify/type-provider-zod` for type inference (when added)
- Schemas should live in `schemas/` directory

## Logging
- Use `request.log` or `fastify.log` for contextual logging
- Log levels: trace, debug, info, warn, error
- Include relevant context in log messages
- Never log sensitive data (tokens, passwords, PII)

## Configuration
- Pass config through plugin options
- Access via `fastify.config` after decoration
- Validate config at startup with Zod
