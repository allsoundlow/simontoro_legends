# Requirements Document

## Introduction

This document defines the requirements for a Help Menu Command feature that displays a list of all available bot commands to users in private chat. The help menu provides users with a quick reference to discover and understand the bot's capabilities without needing external documentation.

## Glossary

- **Help_Command**: The `/help` command that triggers the display of the help menu
- **Command_Registry**: A centralized registry that stores metadata about all available commands including their names, descriptions, and usage patterns
- **Private_Chat**: A direct message conversation between a user and the bot (not a group chat)
- **Command_Metadata**: Information about a command including its name, description, and optional usage example

## Requirements

### Requirement 1: Help Command Trigger

**User Story:** As a user, I want to type /help in private chat, so that I can see a list of all available commands.

#### Acceptance Criteria

1. WHEN a user sends `/help` in a private chat, THE Help_Command SHALL display the help menu
2. WHEN a user sends `/help` in a group chat, THE Help_Command SHALL not respond
3. THE Help_Command SHALL only respond to the exact `/help` command without additional arguments

### Requirement 2: Command Registry

**User Story:** As a developer, I want a centralized command registry, so that I can easily add new commands and have them automatically appear in the help menu.

#### Acceptance Criteria

1. THE Command_Registry SHALL store command name, description, and optional usage example for each command
2. THE Command_Registry SHALL support adding new commands programmatically
3. THE Command_Registry SHALL return all registered commands in a consistent order
4. THE Command_Registry SHALL allow grouping commands by category (e.g., "Admin Commands", "Group Commands")

### Requirement 3: Help Menu Display

**User Story:** As a user, I want the help menu to be clearly formatted, so that I can easily find and understand available commands.

#### Acceptance Criteria

1. THE Help_Command SHALL display commands grouped by category with category headers
2. THE Help_Command SHALL display each command with its name and description
3. THE Help_Command SHALL format command names in a visually distinct way (e.g., bold or monospace)
4. WHEN a command has a usage example, THE Help_Command SHALL display it below the description
5. THE Help_Command SHALL include a header message welcoming the user to the help menu

### Requirement 4: Command Metadata Structure

**User Story:** As a developer, I want a consistent structure for command metadata, so that the help menu displays uniform information.

#### Acceptance Criteria

1. THE Command_Metadata SHALL include a required `command` field containing the command name (e.g., "/register")
2. THE Command_Metadata SHALL include a required `description` field explaining what the command does
3. THE Command_Metadata SHALL include an optional `usage` field showing example usage
4. THE Command_Metadata SHALL include a required `category` field for grouping in the help menu
5. THE Command_Metadata SHALL include an optional `privateOnly` field indicating if the command works only in private chat

### Requirement 5: Integration with Existing Router

**User Story:** As a developer, I want the help command to integrate with the existing Telegram Router, so that it follows established patterns.

#### Acceptance Criteria

1. THE Help_Command SHALL be implemented as a CommandDefinition compatible with the TelegramRouter
2. THE Help_Command SHALL use the existing response formatting system for output
3. WHEN the help command is registered, THE Command_Registry SHALL be populated with all available commands
4. THE Help_Command SHALL not require a use case since it only reads from the Command_Registry
