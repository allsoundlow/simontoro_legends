# Code Style & Conventions

## TypeScript
- Use strict mode - no `any` types unless absolutely necessary
- Prefer `type` over `interface` for object shapes
- Use `z.infer<typeof schema>` to derive types from Zod schemas
- Export types alongside their schemas
- Use `as const` for literal object values

## Imports
- Imports are auto-sorted by eslint-plugin-simple-import-sort
- Order: node builtins → external packages → internal modules
- Use relative imports within the same package
- No barrel exports (index.ts re-exports) unless explicitly needed

## Naming
- Files: kebab-case (e.g., `config-loader.ts`, `server-options.ts`)
- Types/Interfaces: PascalCase (e.g., `AppConfig`, `LogLevel`)
- Functions/Variables: camelCase
- Constants: camelCase or SCREAMING_SNAKE_CASE for true constants
- Zod schemas: camelCase with `Schema` suffix (e.g., `configSchema`)

## Formatting (Prettier)
```json
{
  "semi": true,
  "singleQuote": false,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "bracketSpacing": false
}
```

## Functions
- Prefer arrow functions for callbacks and inline functions
- Use regular functions for top-level exports and Fastify handlers
- Keep functions small and focused
- Use early returns to reduce nesting

## Error Handling
- Use Zod for input validation - let it throw on invalid data
- Wrap external API calls in try/catch
- Log errors with full context before re-throwing or handling
- Use Fastify's error handling for HTTP errors
