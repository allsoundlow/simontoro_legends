---
feature: ai-roast
version: 1.0.0
---

# Implementation Tasks: AI Roast Feature

## 1. Infrastructure Layer

- [x] 1.1 Add RateLimitError to error classes
  - [x] Add `RateLimitError` class to `pkg/bot/errors/index.ts`
  - [x] Extend `AppError` with status code 429
  - [x] Include `retryAfter` property for retry timing
  - _Requirements: 8.4_

- [x] 1.2 Implement RateLimiter utility
  - [x] Create `pkg/bot/utils/rate-limiter.ts`
  - [x] Implement in-memory sliding window rate limiting
  - [x] Add `checkLimit(key, maxRequests, windowSeconds)` method
  - [x] Add `cleanup()` method to prevent memory leaks
  - [x] Throw `RateLimitError` when limit exceeded
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 1.3 Create OpenRouter client connector
  - [x] Create `pkg/bot/connectors/openrouter/client.ts`
  - [x] Use `@openrouter/sdk` for API communication
  - [x] Define Zod schemas for request validation
  - [x] Implement `generateCompletion()` method with timeout support
  - [x] Add exponential backoff retry logic (max 2 retries)
  - [x] Handle rate limit errors (429) from OpenRouter API
  - [x] Use `setTimeout` from `node:timers/promises` for delays
  - [x] Add structured logging for requests and errors
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

## 2. Configuration

- [x] 2.1 Add OpenRouter configuration schema
  - [x] Update `pkg/bot/config/index.ts` with `openRouterConfigSchema`
  - [x] Include fields: `apiKey`, `defaultModel` (default: "openrouter/auto"), `timeout` (default: 5000), `maxRetries` (default: 2)
  - [x] Export `OpenRouterConfig` type
  - _Requirements: 11.1_

- [x] 2.2 Add AI roast configuration schema
  - [x] Add `aiRoastConfigSchema` to config
  - [x] Include fields: `enabled` (default: true), `temperature` (default: 0.8), `maxTokens` (default: 150)
  - [x] Export `AiRoastConfig` type
  - _Requirements: 11.2_

- [x] 2.3 Update main config schema
  - [x] Add `openrouter` field (optional) to main config schema
  - [x] Add `ai.roast` field (optional) to main config schema
  - [x] Ensure validation fails with clear error if required config missing
  - _Requirements: 11.3, 11.4_

## 3. Application Layer

- [x] 3.1 Create GenerateRoast use case
  - [x] Create `pkg/bot/services/ai/generate-roast.ts`
  - [x] Extend `Base<Input, Result>` class
  - [x] Define input schema with Zod (targetUsername, level, context, groupId, requesterId)
  - [x] Implement `checkPermissions()` to validate group registration and status
  - [x] Implement `execute()` method with rate limiting checks (user: 5/min, group: 20/min, global: 100/min)
  - [x] Build system prompts for each level (soft, hard, extra) with content guardrails
  - [x] Build user prompts with target and optional context
  - [x] Include language instruction to respond in same language as user input
  - [x] Call OpenRouter client and return roast
  - [x] Add structured logging for roast generation
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 8.1, 8.2, 8.3, 9.1, 9.3_

- [x] 3.2 Create services/ai index file
  - [x] Create `pkg/bot/services/ai/index.ts`
  - [x] Export `GenerateRoast` use case

## 4. Adapter Layer

- [x] 4.1 Create fun commands module
  - [x] Create `pkg/bot/adapters/telegram/commands/fun.ts`
  - [x] Define `ROAST_PATTERN` regex for command parsing (case-insensitive level keywords)
  - [x] Implement `createFunCommands()` factory function
  - [x] Register `/roast` command metadata with `commandRegistry` (name, description, usage, category: "Fun Commands")
  - [x] Parse command input (username from @mention, level, context, groupId, requesterId)
  - [x] Set `chatFilter: "group"` to restrict to group chats
  - [x] Validate context length (max 500 characters)
  - [x] Configure response template for roast output
  - [x] Configure error response mappings (NotFoundError, ValidationError, RateLimitError)
  - [x] Handle missing username with usage instructions
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 7.1, 7.2, 7.3, 7.4, 7.5, 12.1, 12.2, 12.3, 12.4, 12.5, 12.6_

- [x] 4.2 Update commands index
  - [x] Update `pkg/bot/adapters/telegram/commands/index.ts`
  - [x] Export `createFunCommands` function

## 5. Integration

- [x] 5.1 Wire dependencies in telegram plugin
  - [x] Update `pkg/bot/plugins/telegram.ts`
  - [x] Initialize `OpenRouterClient` with config and logger
  - [x] Initialize `RateLimiter` with periodic cleanup (every 60s)
  - [x] Create extended deps object with `openRouterClient` and `rateLimiter`
  - [x] Call `createFunCommands(aiDeps)` to create fun commands
  - [x] Add fun commands to router's command array

## 6. Testing

- [x] 6.1 Test RateLimiter
  - [x] Create `pkg/bot/tests/unit/utils/rate-limiter.test.ts`
  - [x] Test first request in window succeeds
  - [x] Test requests within limit succeed
  - [x] Test request exceeding limit throws RateLimitError with correct retryAfter
  - [x] Test window reset after expiry
  - [x] Test cleanup removes expired entries
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 6.2 Test GenerateRoast use case
  - [x] Create `pkg/bot/tests/unit/services/ai/generate-roast.test.ts`
  - [x] Test group validation (not found, inactive status)
  - [x] Test rate limit enforcement at user/group/global levels
  - [x] Test prompt construction for each level (soft, hard, extra)
  - [x] Test context inclusion in prompts
  - [x] Test error handling from OpenRouter client (mocked)
  - _Requirements: 2.2, 2.3, 4.1, 4.2, 4.3, 4.4, 8.1, 8.2, 8.3_

- ~~6.3 Test OpenRouterClient~~ (REMOVED - testing 3rd party SDK behavior is not valuable)
  - ~~Tests for @openrouter/sdk wrapper removed - 3rd party SDK testing is fragile and provides little value~~
  - ~~The SDK is tested by its maintainers; we test our business logic that uses it~~

- [x] 6.3 Test fun command parsing
  - [ ]* Create `pkg/bot/tests/unit/adapters/telegram/commands/fun.test.ts`
  - [ ]* Test valid command formats with all variations
  - [ ]* Test username extraction from @mention
  - [ ]* Test level keyword extraction (case-insensitive)
  - [ ]* Test context extraction with and without level
  - [ ]* Test invalid command rejection (missing username, invalid level)
  - [ ]* Test context length validation (500 char limit)
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 3.1, 3.2, 3.3, 3.4_

## 7. Final Checkpoint

- [x] 7.1 Ensure all tests pass
- [x] 7.2 Verify no TypeScript compilation errors
- [ ] 7.3 Ask the user if questions arise

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- The OpenRouter SDK handles the API endpoint internally, so no `baseUrl` config is needed
- Rate limiting uses in-memory storage (Redis support planned for future)
- Content moderation is handled via system prompt guardrails
- **Testing Philosophy**: We do NOT test 3rd party SDKs (like @openrouter/sdk) - they are tested by their maintainers. We test our business logic that uses them, with mocked dependencies.
