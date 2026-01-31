# Implementation Plan: Telegram Account Connection

## Overview

This plan implements the Telegram Account Connection feature, enabling administrators to register with the bot and manage groups through Telegram bot commands. The system uses Telegram user IDs as the primary authentication mechanism.

## Tasks

- [x] 1. Create Administrator and Group Schemas
  - [x] 1.1 Create `pkg/bot/schemas/admin.ts` with administrator entity schema, status enum, and request schemas
    - Define `adminStatusSchema` enum (active, inactive)
    - Define `adminSchema` with pk, telegram_user_id, telegram_username, status, created_at, updated_at
    - Define `createAdminSchema` and `updateAdminSchema` for requests
    - Export all types using `z.infer`
    - _Requirements: 1.4_

  - [x] 1.2 Create `pkg/bot/schemas/group.ts` with group entity schema, status enum, and request schemas
    - Define `groupStatusSchema` enum (active, inactive, bot_removed)
    - Define `groupSchema` with pk, telegram_group_id, group_name, admin_pk, status, created_at, updated_at
    - Define `createGroupSchema` and `updateGroupSchema` for requests
    - Define `groupListItemSchema` for list responses
    - Export all types using `z.infer`
    - _Requirements: 4.5, 5.2_

- [x] 2. Create Administrator Repository
  - [x] 2.1 Create `pkg/bot/repositories/admin.repository.ts` with AdminRepository class
    - Implement constructor accepting `StorageAdapter<Admin>`
    - Implement `findById(pk)` method
    - Implement `findByTelegramId(telegramUserId)` method using `getOneByFields`
    - Implement `create(data: CreateAdminRequest)` method with timestamp handling
    - Implement `update(pk, data: UpdateAdminRequest)` method
    - Implement `delete(pk)` method
    - _Requirements: 1.1, 1.4, 2.1_

- [x] 3. Create Group Repository
  - [x] 3.1 Create `pkg/bot/repositories/group.repository.ts` with GroupRepository class
    - Implement constructor accepting `StorageAdapter<Group>`
    - Implement `findById(pk)` method
    - Implement `findByTelegramGroupId(telegramGroupId)` method
    - Implement `findAllByAdminPk(adminPk)` method returning `GroupListItem[]`
    - Implement `countByAdminPk(adminPk)` method
    - Implement `create(data: CreateGroupRequest)` method with timestamp handling
    - Implement `update(pk, data: UpdateGroupRequest)` method
    - Implement `delete(pk)` method
    - Implement `deleteAllByAdminPk(adminPk)` method
    - Implement `markAllInactiveByAdminPk(adminPk)` method
    - _Requirements: 4.5, 5.1, 6.3, 7.2_

- [x] 4. Create Admin Service
  - [x] 4.1 Create `pkg/bot/services/admin.service.ts` with AdminService class
    - Define `AdminServiceError` and `AdminServiceResult<T>` types
    - Implement constructor accepting AdminRepository and GroupRepository
    - Implement `register(telegramUserId, telegramUsername)` method
      - Check for existing registration, return error if already registered
      - Reactivate if inactive
      - Create new admin record
    - Implement `getByTelegramId(telegramUserId)` method
      - Return not_registered error for non-existent or inactive admins
    - Implement `getStatus(telegramUserId)` method
      - Return admin info with group count
    - Implement `deleteAccount(telegramUserId)` method
      - Mark all groups as inactive
      - Delete admin record
    - _Requirements: 1.1, 1.2, 1.5, 2.1, 2.3, 7.2, 8.1, 8.2, 9.1, 9.3_

- [x] 5. Create Group Service
  - [x] 5.1 Create `pkg/bot/services/group.service.ts` with GroupService class
    - Define `GroupServiceError` and `GroupServiceResult<T>` types
    - Implement constructor accepting GroupRepository and AdminRepository
    - Implement `registerGroup(adminTelegramId, telegramGroupId, groupName)` method
      - Verify admin is registered
      - Check for existing group, reactivate if inactive
      - Create new group record
    - Implement `listGroups(adminTelegramId)` method
      - Return all groups for the admin with status
    - Implement `unregisterGroup(adminTelegramId, telegramGroupId)` method
      - Verify admin owns the group
      - Mark group as inactive (preserve data)
    - Implement `markBotRemoved(telegramGroupId)` method
      - Mark group status as bot_removed
    - Implement `isGroupAdmin(adminTelegramId, telegramGroupId)` method
      - Check if admin owns the registered group
    - _Requirements: 4.2, 4.4, 5.1, 5.3, 5.4, 6.1, 6.3, 6.4_

- [x] 6. Database Schema Migration
  - [x] 6.1 Create SQL migration for administrators table
    - Create `administrators` table with pk, telegram_user_id (unique), telegram_username, status, created_at, updated_at
    - Create index on telegram_user_id
    - Create index on status
    - Create trigger for updated_at auto-update
    - _Requirements: 1.4_

  - [x] 6.2 Create SQL migration for groups table
    - Create `groups` table with pk, telegram_group_id (unique), group_name, admin_pk (FK), status, created_at, updated_at
    - Create index on telegram_group_id
    - Create index on admin_pk
    - Create index on status
    - Create trigger for updated_at auto-update
    - _Requirements: 4.5_

- [x] 7. Unit Tests for Admin Service
  - [x] 7.1 Create `pkg/bot/tests/services/admin.service.test.ts`
    - Test: Register new administrator - verify account created with correct fields
    - Test: Register already-registered user - verify error returned
    - Test: Register with null username - verify null stored
    - Test: Get admin by Telegram ID - verify correct admin returned
    - Test: Get non-existent admin - verify not_registered error
    - Test: Get status with groups - verify group count correct
    - Test: Delete account - verify admin removed and groups marked inactive
    - Test: Reactivate inactive admin - verify status changed to active
    - _Requirements: 1.1, 1.2, 1.5, 2.1, 2.3, 7.2, 8.1, 8.2, 9.3_

- [x] 8. Unit Tests for Group Service
  - [x] 8.1 Create `pkg/bot/tests/services/group.service.test.ts`
    - Test: Register group - verify group created with correct admin_pk
    - Test: Register group by non-registered user - verify error
    - Test: Register already-registered group - verify error
    - Test: List groups for admin - verify all groups returned with complete info
    - Test: List groups for admin with no groups - verify empty array
    - Test: Unregister group - verify status changed to inactive
    - Test: Unregister group by wrong admin - verify not_found error
    - Test: Mark bot removed - verify status changed to bot_removed
    - Test: Group isolation - verify admin cannot access other admin's groups
    - _Requirements: 4.2, 4.4, 5.1, 5.3, 5.4, 6.1, 6.3, 6.4_

- [ ] 9. Property-Based Tests for Admin Service (Optional)
  - [ ]* 9.1 Install fast-check dependency in pkg/bot

  - [ ]* 9.2 Write property test for registration uniqueness
    - **Property 1: Registration creates unique admin with correct fields**
    - **Validates: Requirements 1.1, 1.4, 1.5**

  - [ ]* 9.3 Write property test for duplicate registration
    - **Property 2: Duplicate registration returns already-registered error**
    - **Validates: Requirements 1.2**

  - [ ]* 9.4 Write property test for admin lookup round-trip
    - **Property 3: Admin lookup by Telegram ID round-trip**
    - **Validates: Requirements 2.1**

  - [ ]* 9.5 Write property test for non-registered user errors
    - **Property 4: Non-registered users receive appropriate error**
    - **Validates: Requirements 2.3, 8.3**

  - [ ]* 9.6 Write property test for status completeness
    - **Property 10: Status returns complete admin info with group count**
    - **Validates: Requirements 8.1, 8.2**

  - [ ]* 9.7 Write property test for account reactivation
    - **Property 11: Inactive accounts can be reactivated with data preserved**
    - **Validates: Requirements 9.2, 9.3**

- [ ] 10. Property-Based Tests for Group Service (Optional)
  - [ ]* 10.1 Write property test for group registration ownership
    - **Property 5: Group registration creates group with correct ownership**
    - **Validates: Requirements 4.2, 4.5**

  - [ ]* 10.2 Write property test for list groups completeness
    - **Property 6: List groups returns all groups with complete information**
    - **Validates: Requirements 5.1, 5.2, 5.4**

  - [ ]* 10.3 Write property test for unregistration data preservation
    - **Property 7: Unregistration preserves data with inactive status**
    - **Validates: Requirements 6.1, 6.3**

  - [ ]* 10.4 Write property test for bot removal status
    - **Property 8: Bot removal marks group as bot_removed**
    - **Validates: Requirements 6.4**

  - [ ]* 10.5 Write property test for account deletion cascade
    - **Property 9: Account deletion cascades to groups**
    - **Validates: Requirements 7.2**

  - [ ]* 10.6 Write property test for group isolation
    - **Property 12: Group isolation between administrators**
    - **Validates: Multi-tenant isolation**

- [ ] 11. Telegram Adapter Setup (Optional - Phase 2)
  - [ ]* 11.1 Install grammy dependency in pkg/bot

  - [ ]* 11.2 Create `pkg/bot/adapters/telegram/index.ts` with bot setup and middleware registration

  - [ ]* 11.3 Create `pkg/bot/adapters/telegram/middleware/admin-verification.ts`
    - Implement `createAdminMiddleware(adminService)` for registered admin verification
    - Implement `createGroupAdminMiddleware()` for Telegram group admin verification

  - [ ]* 11.4 Create `pkg/bot/adapters/telegram/commands/register.ts`
    - Implement `/register` command handler for private chat
    - _Requirements: 1.1, 1.2, 1.3_

  - [ ]* 11.5 Create `pkg/bot/adapters/telegram/commands/groups.ts`
    - Implement `/groups` command handler
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ]* 11.6 Create `pkg/bot/adapters/telegram/commands/status.ts`
    - Implement `/status` command handler
    - _Requirements: 8.1, 8.2, 8.3_

  - [ ]* 11.7 Create `pkg/bot/adapters/telegram/commands/unregister.ts`
    - Implement `/unregister` command handler
    - _Requirements: 6.1, 6.2_

  - [ ]* 11.8 Create `pkg/bot/adapters/telegram/commands/delete-account.ts`
    - Implement `/deleteaccount` command handler with confirmation flow
    - _Requirements: 7.1, 7.2, 7.3_

  - [ ]* 11.9 Create `pkg/bot/adapters/telegram/handlers/chat-member.ts`
    - Implement bot added/removed from group handler
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 6.4_

- [ ] 12. Integration Tests for Telegram Adapter (Optional - Phase 2)
  - [ ]* 12.1 Create `pkg/bot/tests/adapters/telegram/commands.test.ts`
    - Test: /register command in private chat - verify success response
    - Test: /register command in group chat - verify rejection
    - Test: /groups command - verify formatted list
    - Test: /status command - verify formatted status
    - Test: /unregister command with admin privileges - verify success
    - Test: /unregister command without admin privileges - verify rejection
    - Test: /deleteaccount command - verify confirmation flow

  - [ ]* 12.2 Create `pkg/bot/tests/adapters/telegram/handlers.test.ts`
    - Test: Bot added to group by registered admin - verify group registered
    - Test: Bot added to group by non-registered user - verify rejection message
    - Test: Bot removed from group - verify group marked as bot_removed

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Tasks 1-8 implement the core data layer, business logic, and unit tests (required)
- Tasks 9-10 implement property-based tests (optional)
- Tasks 11-12 implement the Telegram bot integration (optional, can be deferred to Phase 2)
- All property tests use fast-check library with minimum 100 iterations
- Unit tests use Node.js built-in test runner (`node:test`)
- Repository implementations follow the existing KeywordRepository pattern
- Service implementations follow the existing KeywordService pattern with Result types
