# Zod Schema Patterns

## Schema Definition
- Define schemas in dedicated files under `schemas/` or alongside related code
- Export both schema and inferred type together
- Use descriptive names with `Schema` suffix

```typescript
import z from "zod";

export const userSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  email: z.string().email(),
});

export type User = z.infer<typeof userSchema>;
```

## Validation
- Use `.parse()` when you want to throw on invalid data
- Use `.safeParse()` when you need to handle errors gracefully
- Validate at system boundaries (API inputs, config loading, external data)

## Config Schemas
- Follow the pattern in `pkg/bot/config/index.ts`
- Use `z.enum()` for constrained string values
- Provide sensible defaults with `.default()`
- Export a `validateConfig` function

```typescript
export const validateConfig = (config: unknown): AppConfig => {
  return configSchema.parse(config);
};
```

## Composition
- Use `.extend()` to build on existing schemas
- Use `.pick()` and `.omit()` for partial schemas
- Use `.merge()` to combine schemas
- Use `z.union()` for discriminated unions

## API Schemas
- Define separate schemas for request and response
- Use `.strict()` for request bodies to reject extra fields
- Document fields with `.describe()` for OpenAPI generation
