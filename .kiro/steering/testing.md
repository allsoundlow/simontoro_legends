# Testing Guidelines

## Test Framework
- Use Node.js built-in test runner (`node:test`)
- Use built-in `node:assert` for assertions
- Use built-in `mock` from `node:test` for mocking
- No external test libraries needed

## Running Tests
```bash
# From pkg/bot directory
yarn test                    # Run all tests
yarn test --watch            # Watch mode
yarn test tests/routes/      # Run specific directory
```

## Test File Location
- Place tests in `pkg/bot/tests/` directory
- Mirror source structure: `routes/root.ts` → `tests/routes/root.test.ts`
- Name test files with `.test.ts` suffix

## Test Structure
```typescript
import {after, before, describe, it} from "node:test";
import assert from "node:assert";
import {FastifyInstance} from "fastify";

import {build} from "../helper";

describe("ComponentName", () => {
  let app: FastifyInstance;

  before(async () => {
    app = await build();
  });

  after(async () => {
    await app.close();
  });

  describe("methodName", () => {
    it("should do expected behavior when given input", async () => {
      // Arrange
      // Act
      // Assert
    });
  });
});
```

## Build Helper (IMPORTANT)
Always use the `build()` helper from `tests/helper.ts` to create test app instances:

```typescript
import {build} from "../helper";

// Basic usage - loads config from local.test.config.json
const app = await build();

// With config overrides
const app = await build({port: 3001, host: "127.0.0.1"});
```

The helper:
- Loads test config from `local.test.config.json` (or `CONFIG_PATH` env var)
- Accepts partial config overrides for test-specific settings
- Returns a fully configured Fastify instance ready for testing
- Uses `fastify-cli/helper` for proper app bootstrapping

## Fastify Route Testing
Use Fastify's `inject()` method for HTTP testing without network overhead:

```typescript
import {after, before, describe, it} from "node:test";
import assert from "node:assert";
import {FastifyInstance} from "fastify";

import {build} from "../helper";

describe("GET /api/endpoint", () => {
  let app: FastifyInstance;

  before(async () => {
    app = await build();
  });

  after(async () => {
    await app.close();
  });

  it("should return expected data", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/endpoint",
    });

    assert.strictEqual(response.statusCode, 200);
    assert.deepStrictEqual(response.json(), {expected: "data"});
  });

  it("should return 400 for invalid input", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/endpoint",
      payload: {invalid: "data"},
    });

    assert.strictEqual(response.statusCode, 400);
  });
});
```

## Assertions
Use `node:assert` methods:

```typescript
import assert from "node:assert";

// Strict equality
assert.strictEqual(actual, expected);

// Deep equality for objects/arrays
assert.deepStrictEqual(actual, expected);

// Truthy/falsy
assert.ok(value);

// Throws
assert.throws(() => dangerousFunction(), {message: /expected error/});

// Async throws
await assert.rejects(async () => await asyncDangerousFunction(), {message: /expected/});
```

## Mocking
Use `node:test` mock utilities:

```typescript
import {mock} from "node:test";

// Mock a function
const mockFn = mock.fn(() => "mocked value");
mockFn();
assert.strictEqual(mockFn.mock.calls.length, 1);

// Mock a method on an object
mock.method(object, "methodName", () => "mocked");

// Reset mocks
mock.reset();
```

## What to Test
- Zod schema validation (valid and invalid inputs)
- Service business logic
- Route handlers (using Fastify's inject via build helper)
- Repository queries (with test database)

## Test Config
Create `pkg/bot/local.test.config.json` for test-specific settings:

```json
{
  "port": 3001,
  "host": "localhost",
  "logger": {"logLevel": "error", "pretty": false}
}
```

## Best Practices
- Always close the app in `after()` hook to prevent resource leaks
- Use descriptive test names that explain the expected behavior
- Test both success and error paths
- Keep tests isolated - each test should set up its own state
- Prefer integration tests over excessive mocking
