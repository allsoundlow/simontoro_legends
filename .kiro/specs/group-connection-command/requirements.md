# Requirements Document

## Introduction

This feature adds a `/connect_group` command that allows registered admins to connect Telegram group chats with the Saimontoro bot. 

**Connection Flow:**
1. A group admin adds the bot to their Telegram group (via group settings → Add Members)
2. A registered bot admin runs `/connect_group` in that group chat
3. The bot registers the group and sends a welcome message

The command leverages the existing `Register` use case from the group service and integrates with the TelegramRouter pattern for declarative command handling.

## Glossary

- **Admin**: A registered bot administrator identified by their Telegram user ID
- **Group**: A Telegram group or supergroup chat that can be connected to the bot
- **TelegramRouter**: The declarative command routing system that maps commands to use cases
- **CommandRegistry**: Centralized store for command metadata used by the help menu
- **Register_Use_Case**: The existing use case in `services/group/register.ts` that handles group registration logic

## Requirements

### Requirement 1: Group Chat Context Validation

**User Story:** As a bot admin, I want the `/connect_group` command to only work in group chats, so that I don't accidentally try to connect a private chat.

#### Acceptance Criteria

1. WHEN a user sends `/connect_group` in a private chat, THE TelegramRouter SHALL ignore the command (no response)
2. WHEN a user sends `/connect_group` in a group or supergroup chat, THE TelegramRouter SHALL process the command
3. THE Command_Definition SHALL use the `chatFilter: "group"` option to enforce group-only execution

### Requirement 2: Group Information Extraction

**User Story:** As a bot admin, I want the command to automatically extract group information from the chat context, so that I don't have to manually provide group details.

#### Acceptance Criteria

1. WHEN the command is executed, THE parseInput function SHALL extract the telegram_group_id from `ctx.chat.id`
2. WHEN the command is executed, THE parseInput function SHALL extract the group_name from `ctx.chat.title`
3. WHEN the command is executed, THE parseInput function SHALL extract the adminTelegramId from `ctx.from.id`
4. THE parseInput function SHALL convert numeric IDs to strings as required by the Register_Use_Case input schema

### Requirement 3: Group Registration via Use Case

**User Story:** As a bot admin, I want to connect my group to the bot, so that I can use bot features in that group.

#### Acceptance Criteria

1. WHEN a registered admin executes `/connect_group`, THE Command_Definition SHALL call the Register_Use_Case with the extracted input
2. WHEN the Register_Use_Case succeeds with a new group, THE Command_Definition SHALL display a welcome message to the group including the group name
3. WHEN the Register_Use_Case succeeds by reactivating an inactive group, THE Command_Definition SHALL display a welcome back message to the group

### Requirement 4: Welcome Message

**User Story:** As a group member, I want to see a welcome message when the bot is connected, so that I know the bot is ready to use.

#### Acceptance Criteria

1. WHEN a group is successfully connected, THE Bot SHALL send a welcome message visible to all group members
2. THE welcome message SHALL include the group name
3. THE welcome message SHALL briefly explain what the bot can do (e.g., keywords, stats)
4. THE welcome message SHALL mention the `/help` command for more information

### Requirement 5: Error Handling

**User Story:** As a user, I want clear error messages when the command fails, so that I understand what went wrong and how to fix it.

#### Acceptance Criteria

1. IF the user is not a registered admin, THEN THE Command_Definition SHALL display an error message instructing them to register first via `/register` in private chat
2. IF the group is already connected and active, THEN THE Command_Definition SHALL display an error message indicating the group is already registered
3. IF an unexpected error occurs, THEN THE Command_Definition SHALL display a generic error message

### Requirement 6: Help Menu Integration

**User Story:** As a user, I want to see the `/connect_group` command in the help menu, so that I can discover how to connect groups.

#### Acceptance Criteria

1. THE Command_Definition SHALL register metadata with the CommandRegistry
2. THE metadata SHALL include the command name `/connect_group`
3. THE metadata SHALL include a description explaining the command's purpose
4. THE metadata SHALL categorize the command under "Group Commands"
5. THE metadata SHALL NOT mark the command as `privateOnly` since it works in groups
