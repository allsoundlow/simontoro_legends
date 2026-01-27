# Implementation Plan: Keyword Notification System API

## Overview

This plan implements the REST API for keyword management following the layered architecture. Tasks are ordered to build incrementally from schemas to routes, with each step producing working, testable code.

## Tasks

- [x] 1. Create common Zod schemas for error responses and pagination
  - [x] 1.1 Create `schemas/common/error.ts` with error response schemas
    - Define `errorDetailSchema` for field-level errors
    - Define `errorResponseSchema` for standard error responses
    - Export types using `z.infer`
    - _Requirements: 6.4, 7.1, 7.3_
  - [x] 1.2 Create `schemas/common/pagination.ts` with pagination schemas
    - Define `paginationSchema` for response metadata
    - Define `paginationQuerySchema` for query parameters
    - Export types using `z.infer`
    - _Requirements: 2.5_

- [x] 2. Create keyword-specific Zod schemas
  - [x] 2.1 Create `schemas/keyword.ts` with keyword schemas
    - Define `patternTypeSchema` enum (exact, phrase, wildcard)
    - Define `createKeywordSchema` for POST request body
    - Define `updateKeywordSchema` for PATCH request body (partial)
    - Define `keywordSchema` for response resource
    - Define `keywordListSchema` for list response
    - Define path parameter schemas (`groupIdParamSchema`, `keywordIdParamSchema`)
    - Define `listKeywordsQuerySchema` extending pagination
    - _Requirements: 1.5, 1.6, 1.7, 6.1, 6.2, 6.3_

- [x] 3. Checkpoint - Verify schemas compile correctly
  - Ensure all schemas compile without TypeScript errors
  - Verify type exports are correct

- [x] 4. Create generic Repository interface and KeywordRepository
  - [x] 4.1 Create `repositories/repository.ts` with generic interface
    - Define `Entity` base type with `pk` field (primary key)
    - Define `ListResponse<T>`, `ListQuery`, and `FieldFilter<T>` types
    - Define generic `Repository<T, TCreate, TUpdate>` interface with:
      - `findByPk(pk)` - find by primary key
      - `findOneBy(fields)` - find single entity matching field values
      - `findAllBy(fields, query)` - find all entities matching field values with pagination
      - `create(data)`, `update(pk, data)`, `delete(pk)` - standard CRUD
    - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1_
  - [x] 4.2 Create `repositories/keyword.repository.ts` with keyword repository
    - Define `KeywordRepository` as typed alias of `Repository<Keyword, CreateKeywordRequest, UpdateKeywordRequest>`
    - Create `InMemoryKeywordRepository` class implementing the interface
    - Implement `matchesFields` helper for field-based filtering
    - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1_

- [x] 5. Create KeywordService with business logic
  - [x] 5.1 Create `services/keyword.service.ts` with service implementation
    - Define `KeywordService` class that depends on `KeywordRepository` interface
    - Implement create, list, getById, update, delete methods with business logic
    - Handle duplicate detection, validation, and error mapping
    - _Requirements: 1.1, 1.3, 2.1, 3.1, 4.1, 4.4, 5.1_

- [x] 6. Create keyword API routes
  - [x] 6.1 Create `routes/api/v1/keywords.ts` with route definitions
    - Implement POST `/groups/:groupId/keywords` (create)
    - Implement GET `/groups/:groupId/keywords` (list)
    - Implement GET `/groups/:groupId/keywords/:keywordId` (get single)
    - Implement PATCH `/groups/:groupId/keywords/:keywordId` (update)
    - Implement DELETE `/groups/:groupId/keywords/:keywordId` (delete)
    - Wire up Zod schemas for validation
    - Connect handlers to KeywordService
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4_
  - [x] 6.2 Register keyword routes in `app.ts`
    - Import keyword routes
    - Register with `/api/v1/` prefix
    - _Requirements: 6.6_

- [x] 7. Implement error handling
  - [x] 7.1 Create error handling utilities
    - Create helper to format Zod validation errors
    - Create helper to generate error responses with request_id
    - Implement 404, 409, 400 error response helpers
    - _Requirements: 6.4, 7.1, 7.2, 7.3, 7.4_
  - [x] 7.2 Add error handling to route handlers
    - Handle service layer errors (not found, conflict)
    - Format validation errors with field details
    - Include request_id in all error responses
    - _Requirements: 1.2, 1.3, 1.4, 3.2, 3.3, 3.4, 4.2, 4.3, 4.4, 5.2, 5.3, 5.4_

- [x] 8. Checkpoint - Verify routes work with in-memory repository
  - Ensure all routes respond correctly
  - Verify error responses match schema

- [x] 9. Write unit tests for keyword API
  - [x] 9.1 Create `tests/routes/keywords.test.ts`
    - Test create keyword with all fields
    - Test create keyword with defaults
    - Test list keywords
    - Test list empty group
    - Test get single keyword
    - Test get non-existent keyword (404)
    - Test update keyword
    - Test partial update
    - Test delete keyword
    - Test delete non-existent (404)
    - Test duplicate keyword conflict (409)
    - Test invalid request body (400)
    - Test pagination parameters
    - Test filter by pattern_type
    - _Requirements: 1.1-1.8, 2.1-2.6, 3.1-3.4, 4.1-4.6, 5.1-5.4, 6.1-6.5, 7.1-7.4_

- [x] 10. Final checkpoint - All tests pass
  - Ensure all tests pass
  - Ask the user if questions arise

## Notes

- The generic `Repository<T>` interface provides `findOneBy` and `findAllBy` for flexible field-based queries
- All entities use `pk` (primary key) as the serial identifier column
- `KeywordRepository` is a typed alias - no entity-specific query methods needed
- `InMemoryKeywordRepository` uses in-memory storage for testing the API layer
- Database integration (Kysely implementation) can replace the in-memory implementation later
- Authentication/authorization is not implemented in this spec
- Each task references specific requirements for traceability
