# Requirements Document

## Introduction

This feature implements the StorageAdapter pattern as described in `.kiro/steering/repositories.md`. The goal is to create a two-layer data access pattern that separates low-level storage operations (StorageAdapter) from business queries (Repository). This enables repositories to work with any storage backend (in-memory, PostgreSQL, etc.) without code changes.

The current implementation has `InMemoryKeywordRepository` implementing the `Repository` interface directly, mixing storage logic with business logic. This refactoring will:
1. Create a generic `StorageAdapter` interface for low-level CRUD operations
2. Implement `InMemoryAdapter` and `KyselyAdapter` (PostgreSQL) adapters
3. Create connection management for different storage backends
4. Refactor `KeywordRepository` to use `StorageAdapter` instead of implementing storage directly

## Glossary

- **StorageAdapter**: Generic interface for low-level data operations (get, insert, update, remove, count) that works with any entity type
- **Repository**: Entity-specific class containing business queries and domain logic, uses StorageAdapter for data access
- **Connection**: Object representing a connection to a data source (memory or PostgreSQL)
- **Entity**: Base type for all storable objects, requires a numeric `pk` (primary key) field
- **FieldFilter**: Partial entity fields used for querying (excludes pk and timestamps)
- **ListResult**: Paginated response containing data array and pagination metadata
- **InMemoryAdapter**: StorageAdapter implementation using JavaScript Map for testing
- **PostgresAdapter**: StorageAdapter implementation using Kysely query builder for PostgreSQL (encapsulates Kysely internally)

## Requirements

### Requirement 1: StorageAdapter Interface

**User Story:** As a developer, I want a generic storage adapter interface, so that I can write repositories that work with any storage backend.

#### Acceptance Criteria

1. THE StorageAdapter interface SHALL define a `get(pk: number)` method that returns a single entity or null
2. THE StorageAdapter interface SHALL define a `getOneByFields(fields: FieldFilter<T>)` method that returns the first matching entity or null
3. THE StorageAdapter interface SHALL define a `getAllByFields(fields: FieldFilter<T>, query?: ListQuery)` method that returns paginated results
4. THE StorageAdapter interface SHALL define an `insert(data: Omit<T, "pk">)` method that creates a new entity with auto-generated pk and returns the pk
5. THE StorageAdapter interface SHALL define an `update(pk: number, data: Partial<Omit<T, "pk">>)` method that partially updates an entity and returns the pk or null if not found
6. THE StorageAdapter interface SHALL define a `remove(pk: number)` method that deletes an entity and returns success boolean
7. THE StorageAdapter interface SHALL define a `count(fields: FieldFilter<T>)` method that returns the count of matching entities
8. THE StorageAdapter interface SHALL be generic over entity type T extending Entity base type

### Requirement 2: InMemoryAdapter Implementation

**User Story:** As a developer, I want an in-memory storage adapter, so that I can run tests without a database.

#### Acceptance Criteria

1. THE InMemoryAdapter SHALL implement all StorageAdapter interface methods
2. THE InMemoryAdapter SHALL use a JavaScript Map to store entities
3. THE InMemoryAdapter SHALL auto-generate sequential numeric PKs starting from 1
4. WHEN `get(pk)` is called, THE InMemoryAdapter SHALL return the entity with matching pk or null
5. WHEN `getOneByFields(fields)` is called, THE InMemoryAdapter SHALL return the first entity matching all provided field values
6. WHEN `getAllByFields(fields, query)` is called, THE InMemoryAdapter SHALL return paginated results with correct total count
7. WHEN `insert(data)` is called, THE InMemoryAdapter SHALL assign a new pk, store the entity, and return the pk
8. WHEN `update(pk, data)` is called, THE InMemoryAdapter SHALL merge data with existing entity and return the pk, or return null if not found
9. WHEN `remove(pk)` is called, THE InMemoryAdapter SHALL delete the entity and return true, or return false if not found
10. WHEN `count(fields)` is called, THE InMemoryAdapter SHALL return the count of entities matching all provided field values

### Requirement 3: PostgresAdapter Implementation

**User Story:** As a developer, I want a PostgreSQL storage adapter, so that I can persist data to PostgreSQL.

#### Acceptance Criteria

1. THE PostgresAdapter SHALL implement all StorageAdapter interface methods
2. THE PostgresAdapter SHALL accept a pg Pool and table name in its constructor
3. THE PostgresAdapter SHALL internally create a Kysely instance from the Pool
4. WHEN `get(pk)` is called, THE PostgresAdapter SHALL execute a SELECT query with WHERE pk = ?
5. WHEN `getOneByFields(fields)` is called, THE PostgresAdapter SHALL execute a SELECT query with WHERE clauses for each field
6. WHEN `getAllByFields(fields, query)` is called, THE PostgresAdapter SHALL execute SELECT with pagination and a parallel COUNT query
7. WHEN `insert(data)` is called, THE PostgresAdapter SHALL execute an INSERT with RETURNING pk to get the created entity's pk
8. WHEN `update(pk, data)` is called, THE PostgresAdapter SHALL execute an UPDATE with RETURNING pk to get the updated entity's pk or null if not found
9. WHEN `remove(pk)` is called, THE PostgresAdapter SHALL execute a DELETE and return true if rows were deleted
10. WHEN `count(fields)` is called, THE PostgresAdapter SHALL execute a SELECT COUNT(*) with WHERE clauses

### Requirement 4: Connection Management

**User Story:** As a developer, I want connection management utilities, so that I can easily create and close database connections.

#### Acceptance Criteria

1. THE Connection module SHALL define a `MemoryConnection` type with `type: "memory"`
2. THE Connection module SHALL define a `PostgresConnection` type with `type: "postgres"` and a pg Pool instance
3. THE Connection module SHALL define a `PgConfig` type for PostgreSQL configuration (host, port, database, user, password)
4. WHEN `createConnection(config)` is called with `pg` config present, THE module SHALL create a pg Pool and return PostgresConnection
5. WHEN `createConnection(config)` is called without any database config, THE module SHALL return a MemoryConnection
6. WHEN `closeConnection(connection)` is called with PostgresConnection, THE module SHALL end the pg Pool
7. WHEN `closeConnection(connection)` is called with MemoryConnection, THE module SHALL do nothing (no resources to close)

### Requirement 5: Storage Factory

**User Story:** As a developer, I want a factory function to create adapters from connections, so that I can easily wire up repositories.

#### Acceptance Criteria

1. THE `createAdapter` function SHALL accept a Connection and table name
2. WHEN called with MemoryConnection, THE `createAdapter` function SHALL return a new InMemoryAdapter instance
3. WHEN called with PostgresConnection, THE `createAdapter` function SHALL return a new PostgresAdapter instance with the connection's pool and table name
4. THE storage module SHALL re-export all types and functions from adapter and connections modules

### Requirement 6: KeywordRepository Refactoring

**User Story:** As a developer, I want KeywordRepository to use StorageAdapter, so that it works with any storage backend.

#### Acceptance Criteria

1. THE KeywordRepository class SHALL accept a `StorageAdapter<Keyword>` in its constructor
2. THE KeywordRepository SHALL implement `findById(pk)` using `storage.get(pk)`
3. THE KeywordRepository SHALL implement `findByGroupId(groupId, query?)` using `storage.getAllByFields({group_id: groupId}, query)`
4. THE KeywordRepository SHALL implement `findByPattern(groupId, pattern)` using `storage.getOneByFields({group_id: groupId, pattern})`
5. THE KeywordRepository SHALL implement `findAllBy(fields, query?)` using `storage.getAllByFields(fields, query)`
6. THE KeywordRepository SHALL implement `create(groupId, data)` that applies defaults and timestamps before calling `storage.insert()` and returns the pk
7. THE KeywordRepository SHALL implement `update(pk, data)` that adds `updated_at` timestamp before calling `storage.update()` and returns the pk or null
8. THE KeywordRepository SHALL implement `delete(pk)` using `storage.remove(pk)`
9. THE KeywordRepository SHALL implement `countByGroup(groupId)` using `storage.count({group_id: groupId})`
10. THE old `InMemoryKeywordRepository` class SHALL be removed
11. THE old `Repository` interface in `repository.ts` SHALL be removed or deprecated

### Requirement 7: Application Wiring Update

**User Story:** As a developer, I want the application to use the new storage pattern, so that I can switch storage backends via configuration.

#### Acceptance Criteria

1. THE app.ts SHALL create a connection using `createConnection()` with memory config (for now)
2. THE app.ts SHALL create a keyword adapter using `createAdapter<Keyword, "keywords">(connection, "keywords")`
3. THE app.ts SHALL create KeywordRepository with the adapter
4. THE test helper SHALL continue to work with the new pattern (using memory connection)

### Requirement 8: Configuration Schema Update

**User Story:** As a developer, I want storage configuration in the app config, so that I can switch between memory and postgres via config file.

#### Acceptance Criteria

1. THE config schema SHALL include an optional `pg` field for PostgreSQL configuration
2. THE `pg` config object SHALL contain `host`, `port`, `database`, `user`, and `password` fields
3. WHEN `pg` config is present, THE application SHALL use PostgresAdapter
4. WHEN no database config is present (no `pg`, `mysql`, etc.), THE application SHALL use InMemoryAdapter
5. THE config schema SHALL be extensible to support future database backends (mysql, mongodb, redis) as optional config objects
