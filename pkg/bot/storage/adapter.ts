import type {Pagination} from "../schemas/common/pagination";

// Base entity type - all entities must have numeric pk (primary key)
export type Entity = {
  pk: number;
};

// Field filter - partial entity fields for querying (excludes pk and timestamps)
export type FieldFilter<T> = Partial<Omit<T, "pk" | "created_at" | "updated_at">>;

// Query options for list operations
export type ListQuery = {
  limit?: number;
  offset?: number;
};

// List response with pagination
export type ListResult<T> = {
  data: T[];
  pagination: Pagination;
};

// Generic storage adapter interface
export type StorageAdapter<T extends Entity> = {
  // Get single entity by pk
  get(pk: number): Promise<T | null>;

  // Get single entity matching field values
  getOneByFields(fields: FieldFilter<T>): Promise<T | null>;

  // Get all entities matching field values with pagination
  getAllByFields(fields: FieldFilter<T>, query?: ListQuery): Promise<ListResult<T>>;

  // Insert new entity (pk is auto-generated), returns the pk
  insert(data: Omit<T, "pk">): Promise<number>;

  // Update entity by pk, returns the pk if found
  update(pk: number, data: Partial<Omit<T, "pk">>): Promise<number | null>;

  // Remove entity by pk
  remove(pk: number): Promise<boolean>;

  // Count entities matching field values
  count(fields: FieldFilter<T>): Promise<number>;
};
