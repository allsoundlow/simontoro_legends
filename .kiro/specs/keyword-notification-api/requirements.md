# Requirements Document

## Introduction

This document defines the requirements for the Keyword Notification System REST API. The API provides endpoints for managing keywords that trigger notifications when mentioned in group chat messages. This is the administrative API layer used by the admin dashboard and other clients to perform CRUD operations on keywords.

The API is scoped to groups (multi-tenant) and follows RESTful design principles with proper HTTP methods, status codes, and versioning under the `/api/v1/` prefix.

## Glossary

- **Keyword_API**: The REST API layer that handles HTTP requests for keyword management operations
- **Keyword**: A word, phrase, or pattern that triggers notifications when detected in chat messages
- **Group**: A chat group entity that owns keywords; all keywords are scoped to a specific group
- **Pattern_Type**: The matching strategy for a keyword (exact, phrase, or wildcard)
- **Cooldown**: A time period during which duplicate notifications for the same keyword are suppressed
- **Request_Validator**: The component that validates incoming API request payloads using Zod schemas
- **Response_Serializer**: The component that formats API responses according to defined schemas

## Requirements

### Requirement 1: Create Keyword

**User Story:** As a group admin, I want to create a new keyword for my group via the API, so that the bot can start monitoring for that keyword immediately.

#### Acceptance Criteria

1. WHEN a POST request is sent to `/api/v1/groups/{groupId}/keywords` with a valid keyword payload, THE Keyword_API SHALL create the keyword and return a 201 status with the created keyword resource
2. WHEN the request body is missing required fields, THE Request_Validator SHALL return a 400 status with validation error details
3. WHEN the keyword pattern already exists for the group, THE Keyword_API SHALL return a 409 Conflict status with an error message
4. WHEN the groupId does not exist, THE Keyword_API SHALL return a 404 status
5. THE Keyword_API SHALL support creating keywords with pattern types: exact, phrase, and wildcard
6. THE Keyword_API SHALL accept an optional case_sensitive flag (default: false)
7. THE Keyword_API SHALL accept an optional cooldown_seconds field (default: 0, meaning no cooldown)
8. WHEN a keyword is created successfully, THE Response_Serializer SHALL return the complete keyword resource including generated id and timestamps

### Requirement 2: List Keywords

**User Story:** As a user, I want to retrieve all keywords configured for a group via the API, so that I can display them in the admin dashboard.

#### Acceptance Criteria

1. WHEN a GET request is sent to `/api/v1/groups/{groupId}/keywords`, THE Keyword_API SHALL return a 200 status with an array of all keywords for that group
2. WHEN the group has no keywords, THE Keyword_API SHALL return a 200 status with an empty array
3. WHEN the groupId does not exist, THE Keyword_API SHALL return a 404 status
4. THE Response_Serializer SHALL include id, pattern, pattern_type, case_sensitive, cooldown_seconds, created_at, and updated_at for each keyword
5. THE Keyword_API SHALL support optional pagination via query parameters (limit, offset)
6. THE Keyword_API SHALL support optional filtering by pattern_type via query parameter

### Requirement 3: Get Single Keyword

**User Story:** As a user, I want to retrieve a specific keyword by ID via the API, so that I can view its details or populate an edit form.

#### Acceptance Criteria

1. WHEN a GET request is sent to `/api/v1/groups/{groupId}/keywords/{keywordId}`, THE Keyword_API SHALL return a 200 status with the keyword resource
2. WHEN the keywordId does not exist, THE Keyword_API SHALL return a 404 status
3. WHEN the groupId does not exist, THE Keyword_API SHALL return a 404 status
4. WHEN the keyword exists but belongs to a different group, THE Keyword_API SHALL return a 404 status

### Requirement 4: Update Keyword

**User Story:** As a group admin, I want to update an existing keyword via the API, so that I can change its pattern, case sensitivity, or cooldown settings.

#### Acceptance Criteria

1. WHEN a PATCH request is sent to `/api/v1/groups/{groupId}/keywords/{keywordId}` with valid update fields, THE Keyword_API SHALL update the keyword and return a 200 status with the updated resource
2. WHEN the request body contains invalid field values, THE Request_Validator SHALL return a 400 status with validation error details
3. WHEN the keywordId does not exist, THE Keyword_API SHALL return a 404 status
4. WHEN the updated pattern conflicts with an existing keyword in the group, THE Keyword_API SHALL return a 409 Conflict status
5. THE Keyword_API SHALL support partial updates (only provided fields are updated)
6. WHEN a keyword is updated successfully, THE Response_Serializer SHALL return the complete updated keyword resource with new updated_at timestamp

### Requirement 5: Delete Keyword

**User Story:** As a group admin, I want to delete a keyword via the API, so that the bot stops monitoring for that keyword.

#### Acceptance Criteria

1. WHEN a DELETE request is sent to `/api/v1/groups/{groupId}/keywords/{keywordId}`, THE Keyword_API SHALL delete the keyword and return a 204 No Content status
2. WHEN the keywordId does not exist, THE Keyword_API SHALL return a 404 status
3. WHEN the groupId does not exist, THE Keyword_API SHALL return a 404 status
4. WHEN the keyword exists but belongs to a different group, THE Keyword_API SHALL return a 404 status

### Requirement 6: Request/Response Schema Validation

**User Story:** As a developer, I want all API requests and responses to be validated against Zod schemas, so that the API is type-safe and generates accurate OpenAPI documentation.

#### Acceptance Criteria

1. THE Request_Validator SHALL validate all request bodies against Zod schemas before processing
2. THE Request_Validator SHALL validate path parameters (groupId, keywordId) as valid identifiers
3. THE Request_Validator SHALL validate query parameters against their defined schemas
4. WHEN validation fails, THE Request_Validator SHALL return a 400 status with a structured error response containing field-level error details
5. THE Response_Serializer SHALL serialize all responses according to defined Zod schemas
6. THE Keyword_API SHALL expose OpenAPI documentation generated from Zod schemas at a documentation endpoint

### Requirement 7: Error Response Format

**User Story:** As a client developer, I want consistent error responses from the API, so that I can handle errors predictably in my application.

#### Acceptance Criteria

1. WHEN an error occurs, THE Keyword_API SHALL return a JSON response with error code, message, and optional details
2. THE Keyword_API SHALL use appropriate HTTP status codes: 400 for validation errors, 404 for not found, 409 for conflicts, 500 for server errors
3. WHEN a validation error occurs, THE Response_Serializer SHALL include an array of field-specific error messages
4. THE Keyword_API SHALL include a request_id in error responses for debugging purposes
