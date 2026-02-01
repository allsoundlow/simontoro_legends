# Implementation Plan: Help Menu Command

## Overview

This plan implements a Help Menu Command feature that displays all available bot commands to users in private chat. The implementation introduces a Command Registry pattern for centralized command metadata storage and a `/help` command that reads from the registry.

## Tasks

- [x] 1. Add CommandMetadata Schema
  - [x] 1.1 Add `commandMetadataSchema` Zod schema to `pkg/bot/adapters/telegram/types.ts`
    - Define schema with command, description, usage, category, privateOnly fields
    - Export CommandMetadata type
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  
  - [x] 1.2 Add `chatFilter` optional field to `CommandDefinition` type
    - Add optional chatFilter property with "private" | "group" | "all" values
    - _Requirements: 1.2_

- [x] 2. Implement Command Registry
  - [x] 2.1 Create `pkg/bot/adapters/telegram/command-registry.ts` with `CommandRegistry` class
    - Create class with private commands array
    - Define predefined category order
    - _Requirements: 2.1, 2.4_
  
  - [x] 2.2 Implement `register()` and `registerMany()` methods
    - Validate metadata with Zod schema
    - Add to internal commands array
    - _Requirements: 2.2_
  
  - [x] 2.3 Implement `getAll()` and `getByCategory()` methods with category ordering
    - Return all commands in registration order
    - Group by category with predefined ordering
    - _Requirements: 2.3, 2.4_
  
  - [x] 2.4 Implement `clear()` method for testing
    - Reset internal commands array
  
  - [x] 2.5 Export singleton instance
    - Export commandRegistry singleton for app-wide use

- [x] 3. Add Chat Filter Support to Router
  - [x] 3.1 Update `TelegramRouter.handleMessage()` to check `chatFilter` property
    - Add matchesChatFilter() private method
    - Check filter before executing command
    - _Requirements: 1.2_
  
  - [x] 3.2 Skip command execution if chat type doesn't match filter
    - Return early for non-matching chat types
    - _Requirements: 1.2_

- [x] 4. Implement Help Command
  - [x] 4.1 Create `pkg/bot/adapters/telegram/commands/help.ts` with `createHelpCommand()` factory
    - Accept CommandRegistry as parameter
    - Return CommandDefinition with /help pattern
    - Set chatFilter to "private"
    - _Requirements: 1.1, 1.3, 5.1, 5.4_
  
  - [x] 4.2 Implement help menu formatting with categories and command descriptions
    - Format header with welcome message
    - Group commands by category with headers
    - Format command names in monospace
    - Include usage examples when provided
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  
  - [x] 4.3 Export from `pkg/bot/adapters/telegram/commands/index.ts`
    - Add createHelpCommand export
    - _Requirements: 5.3_

- [x] 5. Register Admin Command Metadata
  - [x] 5.1 Update `createAdminCommands()` in `admin.ts` to register metadata with CommandRegistry
    - Register /register, /status, /delete_account metadata
    - Set category to "Admin Commands"
    - _Requirements: 5.3_

- [x] 6. Unit Tests
  - [x] 6.1 Create `pkg/bot/tests/unit/command-registry.test.ts` with registry tests
    - Test register, registerMany, getAll, getByCategory, clear methods
    - Test category ordering
  
  - [x] 6.2 Create `pkg/bot/tests/unit/help-command.test.ts` with help command tests
    - Test pattern matching
    - Test chat filter
    - Test output formatting

## Notes

- The Command Registry is a singleton to ensure all commands register to the same place
- Help command uses an inline use case object since it has no business logic requiring validation
- Chat filtering is declarative via CommandDefinition property for consistency with router patterns
