# Requirements Document

## Introduction

This document defines the requirements for a declarative Telegram Router that provides command-to-use-case mapping for admin commands. The router acts as a thin controller layer between the grammY Telegram bot framework and the existing use case pattern, enabling declarative configuration of command handling, input parsing, and response formatting.

## Glossary

- **Telegram_Router**: The main class that wraps a grammY bot instance and routes incoming messages to use cases based on declarative command definitions
- **Command_Definition**: A declarative configuration object that maps a message pattern to a use case, including input parsing and response formatting
- **Use_Case**: A business logic class extending the Base service that processes validated input and returns a result
- **Response_Formatter**: A component that transforms use case results into Telegram-specific message formats using template interpolation
- **Template_Interpolation**: The process of replacing `{{field}}` placeholders in response templates with actual values from use case results
- **grammY**: The Telegram bot framework used as the underlying transport layer
- **Context**: The grammY context object containing message data and reply methods

## Requirements

### Requirement 1: Command Definition Structure

**User Story:** As a developer, I want to define commands declaratively, so that I can easily configure how Telegram messages map to use cases without writing boilerplate code.

#### Acceptance Criteria

1. THE Command_Definition SHALL include a pattern field containing a RegExp for matching incoming message text
2. THE Command_Definition SHALL include a useCase field containing a use case instance with a run() method
3. THE Command_Definition SHALL include a parseInput field containing a function that extracts use case input from the grammY context
4. THE Command_Definition SHALL include a response field containing response configuration for formatting the use case result
5. THE Command_Definition SHALL optionally include an errorResponse field for custom error handling

### Requirement 2: Message Routing

**User Story:** As a developer, I want the router to match incoming messages against command patterns, so that the correct use case is invoked for each command.

#### Acceptance Criteria

1. WHEN a text message is received, THE Telegram_Router SHALL test the message text against each command pattern in registration order
2. WHEN a message matches a command pattern, THE Telegram_Router SHALL invoke the parseInput function with the grammY context
3. WHEN a message matches a command pattern, THE Telegram_Router SHALL call the use case's run() method with the parsed input
4. WHEN no command pattern matches, THE Telegram_Router SHALL not respond to the message
5. WHEN multiple patterns could match, THE Telegram_Router SHALL use the first matching pattern only

### Requirement 3: Response Types

**User Story:** As a developer, I want to support multiple response types, so that I can send appropriate Telegram message formats for different use cases.

#### Acceptance Criteria

1. THE Response_Formatter SHALL support a "text" response type that sends a plain text message
2. THE Response_Formatter SHALL support a "text_with_keyboard" response type that sends text with an inline keyboard
3. THE Response_Formatter SHALL support a "list" response type that formats arrays as numbered or bulleted lists
4. THE Response_Formatter SHALL support a "silent" response type that sends no message after successful execution
5. WHEN a response type is "text", THE Response_Formatter SHALL use the template field for message content

### Requirement 4: Template Interpolation

**User Story:** As a developer, I want to use template placeholders in response messages, so that I can include dynamic data from use case results.

#### Acceptance Criteria

1. THE Template_Interpolation SHALL replace `{{field}}` placeholders with corresponding values from the use case result
2. THE Template_Interpolation SHALL support nested field access using dot notation (e.g., `{{admin.telegram_username}}`)
3. WHEN a field value is null or undefined, THE Template_Interpolation SHALL replace the placeholder with an empty string
4. WHEN a field path does not exist in the result, THE Template_Interpolation SHALL replace the placeholder with an empty string
5. THE Template_Interpolation SHALL preserve literal text that is not a placeholder

### Requirement 5: Error Handling

**User Story:** As a developer, I want declarative error handling, so that I can configure user-friendly error messages for different error types.

#### Acceptance Criteria

1. WHEN a use case throws an error, THE Telegram_Router SHALL check for a matching errorResponse configuration
2. THE errorResponse configuration SHALL support mapping error types to specific response templates
3. WHEN an error matches a configured error type, THE Telegram_Router SHALL send the corresponding error message
4. WHEN an error does not match any configured error type, THE Telegram_Router SHALL send a generic error message
5. THE errorResponse templates SHALL support template interpolation with error properties (e.g., `{{message}}`)

### Requirement 6: Router Lifecycle

**User Story:** As a developer, I want to control the router lifecycle, so that I can start and stop the bot gracefully.

#### Acceptance Criteria

1. THE Telegram_Router SHALL accept a grammY Bot instance in its constructor
2. THE Telegram_Router SHALL provide a registerCommands() method to register all command definitions
3. THE Telegram_Router SHALL provide a start() method to begin polling for messages
4. THE Telegram_Router SHALL provide a stop() method to gracefully shut down the bot
5. WHEN stop() is called, THE Telegram_Router SHALL complete any in-progress message handling before shutting down

### Requirement 7: Type Safety

**User Story:** As a developer, I want type-safe command definitions, so that I get compile-time errors for misconfigured commands.

#### Acceptance Criteria

1. THE Command_Definition type SHALL be generic over the use case input and output types
2. THE parseInput function type SHALL match the use case's expected input type
3. THE response template fields SHALL be validated against the use case's output type where possible
4. THE Telegram_Router SHALL export all necessary types for external use
5. THE Command_Definition SHALL enforce that useCase has a run() method accepting the parseInput return type

### Requirement 8: Logging Integration

**User Story:** As a developer, I want the router to integrate with the existing logging system, so that I can monitor command execution and debug issues.

#### Acceptance Criteria

1. THE Telegram_Router SHALL accept a logger instance in its constructor
2. WHEN a command is matched, THE Telegram_Router SHALL log the command pattern and user ID at debug level
3. WHEN a use case completes successfully, THE Telegram_Router SHALL log the execution at info level
4. WHEN an error occurs, THE Telegram_Router SHALL log the error with full context at error level
5. THE Telegram_Router SHALL not log sensitive user data such as message content at info level or above
