# Implementation Plan: Storage Adapter Layer

## Overview

This plan implements the two-layer data access pattern with StorageAdapter interface and implementations (InMemoryAdapter, PostgresAdapter), connection management, and refactors KeywordRepository to use the new pattern.

## Tasks

- [x] 1. Create storage adapter interface and types
  - [x] 1.1 Create `pkg/bot/storage/adapter.ts` with Entity, FieldFilter, ListQuery, ListResult types and StorageAdapter interface
    - Define Entity type with `pk: number`
    - Define FieldFilter excluding pk and timestamps
    - Define ListQuery with limit/offset
    - Define ListResult with data array and pagination
    - Define StorageAdapter<T> interface with get, getOneByFields, getAllByFields, insert, update, remove, count methods
    - _Requirements: 1.1-1.8_

- [ ] 2. Implement InMemoryAdapter
  - [x] 2.1 Create `pkg/bot/storage/adapters/in-memory.adapter.ts`
    - Implement StorageAdapter interface using Map<number, T>
    - Auto-generate sequential PKs starting from 1
    - Implement matchesFields helper for filtering
    - Handle pagination in getAllByFields
    - _Requirements: 2.1-2.10_

  - [ ]* 2.2 Write property test for insert-then-get round trip
    - **Property 1: Insert-then-get round trip**
    - **Validates: Requirements 2.4, 2.7**

  - [ ]* 2.3 Write property test for sequential PK generation
    - **Property 2: Sequential PK generation**
    - **Validates: Requirements 2.3**

  - [ ]* 2.4 Write property test for field filtering correctness
    - **Property 3: Field filtering correctness**
    - **Validates: Requirements 2.5, 2.6, 2.10**

  - [ ]* 2.5 Write property test for update preserves unmodified fields
    - **Property 4: Update preserves unmodified fields**
    - **Validates: Requirements 2.8**

  - [ ]* 2.6 Write property test for remove behavior
    - **Property 5: Remove makes entity unretrievable**
    - **Validates: Requirements 2.9**

- [x] 3. Checkpoint - Ensure InMemoryAdapter tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement connection management
  - [x] 4.1 Create `pkg/bot/storage/connections/index.ts` with connection types
    - Define MemoryConnection type with `type: "memory"`
    - Define PostgresConnection type with `type: "postgres"` and `pool: Pool`
    - Define Connection union type
    - Define StorageConfig discriminated union
    - Export createConnection and closeConnection functions
    - _Requirements: 4.1-4.3_

  - [x] 4.2 Create `pkg/bot/storage/connections/memory.connection.ts`
    - Implement createMemoryConnection function
    - _Requirements: 4.4, 4.7_

  - [x] 4.3 Create `pkg/bot/storage/connections/postgres.connection.ts`
    - Implement createPostgresConnection function using pg Pool
    - _Requirements: 4.5, 4.6_

- [x] 5. Implement PostgresAdapter
  - [x] 5.1 Create `pkg/bot/storage/adapters/postgres.adapter.ts`
    - Accept pg Pool and table name in constructor
    - Create Kysely instance internally from Pool
    - Implement all StorageAdapter methods using Kysely queries
    - _Requirements: 3.1-3.10_

- [x] 6. Create storage factory and exports
  - [x] 6.1 Create `pkg/bot/storage/index.ts`
    - Implement createAdapter factory function
    - Return InMemoryAdapter for memory connection
    - Return PostgresAdapter for postgres connection
    - Re-export all types from adapter and connections
    - _Requirements: 5.1-5.4_

- [x] 7. Checkpoint - Ensure storage layer compiles
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Refactor KeywordRepository
  - [x] 8.1 Update `pkg/bot/repositories/keyword.repository.ts`
    - Change constructor to accept StorageAdapter<Keyword>
    - Rename findById parameter from id to pk
    - Implement findByGroupId, findByPattern, findOneBy, findAllBy
    - Implement create with defaults and timestamps
    - Implement update with updated_at timestamp
    - Implement delete and countByGroup
    - _Requirements: 6.1-6.9_

  - [x] 8.2 Remove old Repository interface from `pkg/bot/repositories/repository.ts`
    - Delete the file
    - _Requirements: 6.10, 6.11_

  - [ ]* 8.3 Write property test for repository create applies defaults
    - **Property 6: Repository create applies defaults and timestamps**
    - **Validates: Requirements 6.6**

  - [ ]* 8.4 Write property test for repository update sets timestamp
    - **Property 7: Repository update sets updated_at**
    - **Validates: Requirements 6.7**

- [x] 9. Update application wiring
  - [x] 9.1 Update `pkg/bot/app.ts` to use new storage pattern
    - Create memory connection using createConnection
    - Create keyword adapter using createAdapter
    - Create KeywordRepository with adapter
    - Wire KeywordService with repository
    - _Requirements: 7.1-7.3_

  - [x] 9.2 Update `pkg/bot/services/keyword.service.ts` if needed
    - Update method calls to use pk instead of id if necessary
    - Ensure service works with refactored repository
    - _Requirements: 6.2-6.9_

- [x] 10. Update Keyword schema to use pk
  - [x] 10.1 Update `pkg/bot/schemas/keyword.ts`
    - Rename `id` field to `pk` in keywordSchema
    - Update keywordIdParamSchema to use `keywordPk` or keep as `keywordId` for API compatibility
    - _Requirements: 6.1_

- [x] 11. Update routes to handle pk naming
  - [x] 11.1 Update `pkg/bot/routes/api/v1/keywords.ts` if needed
    - Ensure route handlers work with pk-based repository
    - _Requirements: 7.4_

- [x] 12. Update config schema
  - [x] 12.1 Update `pkg/bot/config/index.ts` with storage config
    - Add pgConfigSchema for PostgreSQL configuration
    - Add optional `pg` field to configSchema
    - If `pg` is present → use PostgresAdapter, otherwise → use InMemoryAdapter
    - _Requirements: 8.1-8.5_

- [x] 13. Update test helper and existing tests
  - [x] 13.1 Update `pkg/bot/tests/helper.ts` if needed
    - Ensure test helper works with new storage pattern
    - _Requirements: 7.4_

  - [x] 13.2 Update existing keyword tests
    - Update tests to work with pk instead of id
    - Ensure all existing tests pass
    - _Requirements: 7.4_

- [x] 14. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties using fast-check
- The implementation uses TypeScript as specified in the design
- Primary key field is named `pk` throughout the codebase
