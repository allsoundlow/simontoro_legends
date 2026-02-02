# Implementation Plan: Group Connection Command

## Overview

This plan implements the `/connect_group` command following the existing TelegramRouter pattern. The command allows registered admins to connect Telegram groups to the bot by executing the command directly in a group chat.

## Tasks

- [x] 1. Create group commands module
  - [x] 1.1 Create `pkg/bot/adapters/telegram/commands/group.ts` with `createGroupCommands` factory function
    - Define `ConnectGroupInput` type matching Register use case input schema
    - Import Register use case from `services/group`
    - Register command metadata with commandRegistry for help menu
    - Create command definition with pattern `/^\/connect_group$/`
    - Set `chatFilter: "group"` to restrict to group chats only
    - Implement `parseInput` to extract adminTelegramId, telegramGroupId, groupName from context
    - Configure success response template with welcome message
    - Configure error response mappings for NotFoundError and ConflictError
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3, 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ]* 1.2 Write property test for parseInput extraction
    - **Property 3: Input Extraction Correctness**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4**

- [x] 2. Register group commands with TelegramRouter
  - [x] 2.1 Update `pkg/bot/plugins/telegram.ts` to import and register group commands
    - Import `createGroupCommands` from commands/group
    - Call factory with dependencies
    - Register commands with router
    - _Requirements: 3.1_

- [x] 3. Checkpoint - Verify command registration
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Add unit tests for group commands
  - [ ]* 4.1 Write unit tests for command definition structure
    - Test command metadata is registered correctly
    - Test chatFilter is set to "group"
    - Test error mappings are configured
    - _Requirements: 1.3, 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ]* 4.2 Write property tests for chat filter behavior
    - **Property 1: Private Chat Filter**
    - **Property 2: Group Chat Processing**
    - **Validates: Requirements 1.1, 1.2**

  - [ ]* 4.3 Write property tests for response formatting
    - **Property 4: Success Response Contains Group Name**
    - **Property 5: NotFoundError Mapping**
    - **Property 6: ConflictError Mapping**
    - **Property 7: Default Error Handling**
    - **Validates: Requirements 3.2, 4.2, 5.1, 5.2, 5.3**

- [x] 5. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- The existing Register use case handles all business logic (group creation, reactivation, conflict detection)
- The TelegramRouter already supports `chatFilter` for restricting commands to specific chat types
- Property tests use `fast-check` library with minimum 100 iterations
