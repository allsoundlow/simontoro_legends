# Implementation Plan: Telegram Router

## Overview

This plan implements a declarative Telegram Router that maps commands to use cases. The implementation follows the existing project patterns: TypeScript with Zod validation, grammY as the Telegram transport, and the established use case architecture.

## Tasks

- [x] 1. Set up project structure and dependencies
  - [x] 1.1 Add grammY dependency to package.json
    - Add `grammy` as a production dependency
    - _Requirements: 6.1_
  
  - [x] 1.2 Create adapters/telegram directory structure
    - Create `pkg/bot/adapters/telegram/` directory
    - Create placeholder files: `router.ts`, `types.ts`, `response-formatter.ts`, `template.ts`, `index.ts`
    - _Requirements: 1.1-1.5_

- [x] 2. Implement template interpolation
  - [x] 2.1 Implement the interpolate function in template.ts
    - Parse `{{field}}` and `{{nested.field}}` placeholders
    - Support dot notation for nested access
    - Return empty string for null/undefined/missing values
    - Preserve non-placeholder text
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  
- [x] 3. Implement response formatter
  - [x] 3.1 Define response type schemas in types.ts
    - Define Zod schemas for TextResponse, TextWithKeyboardResponse, ListResponse, SilentResponse
    - Define ResponseConfig discriminated union
    - Define ErrorMapping and ErrorResponseConfig schemas
    - Export inferred types
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  
  - [x] 3.2 Implement response formatting functions in response-formatter.ts
    - Implement `formatTextResponse()` using template interpolation
    - Implement `formatListResponse()` for array formatting
    - Implement `formatTextWithKeyboardResponse()` for keyboard responses
    - Handle silent response (return null)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  
  - [x] 3.3 Implement error response formatting
    - Implement `formatErrorResponse()` that matches error type to mappings
    - Use default template when no mapping matches
    - Support `{{message}}` interpolation with error.message
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  
- [x] 4. Checkpoint - Verify template and formatter implementation
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement TelegramRouter class
  - [x] 5.1 Define CommandDefinition type in types.ts
    - Generic type over TInput and TResult
    - Include pattern, useCase, parseInput, response, errorResponse fields
    - Ensure useCase has run() method with correct signature
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 7.1, 7.2, 7.5_
  
  - [x] 5.2 Implement TelegramRouter constructor and registration
    - Accept Bot and logger in constructor options
    - Implement `register()` method to add command definitions
    - Store commands in registration order
    - _Requirements: 6.1, 6.2, 8.1_
  
  - [x] 5.3 Implement command matching and execution
    - Implement `registerCommands()` to set up grammY message handler
    - Match message text against patterns in order
    - Call parseInput and use case run() on match
    - Format and send response
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  
  - [x] 5.4 Implement error handling in router
    - Catch use case errors and format with errorResponse
    - Log errors with context (user ID, pattern, no message content)
    - Send formatted error response to user
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 8.4_
  
  - [x] 5.5 Implement logging integration
    - Log matched commands at debug level
    - Log successful executions at info level
    - Ensure message content not logged at info+
    - _Requirements: 8.2, 8.3, 8.5_
  
  - [x] 5.6 Implement start() and stop() lifecycle methods
    - Implement `start()` to begin polling
    - Implement `stop()` for graceful shutdown
    - _Requirements: 6.3, 6.4_
  
- [x] 6. Checkpoint - Verify router implementation
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Create public exports and integrate with app
  - [x] 7.1 Create index.ts with public exports
    - Export TelegramRouter class
    - Export all types (CommandDefinition, ResponseConfig, etc.)
    - Export response formatter functions
    - _Requirements: 7.4_
  
  - [x] 7.2 Create admin command definitions
    - Define commands for Register, GetStatus, DeleteAccount use cases
    - Configure response templates and error responses
    - Wire up with use case dependencies
    - _Requirements: 1.1-1.5, 3.1, 5.1-5.5_
  
- [x] 8. Final checkpoint - Verify complete implementation
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- grammY is used as the Telegram transport layer
- The router lives in `pkg/bot/adapters/telegram/` following the architecture guidelines
- Use cases remain platform-agnostic; only the router knows about Telegram
