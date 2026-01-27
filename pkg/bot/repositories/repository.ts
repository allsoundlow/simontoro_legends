import type {Pagination} from "../schemas/common/pagination";

// Base entity type - all entities must have an id field
export type Entity = {
  id: number;
};

// Generic list response with pagination
export type ListResponse<T> = {
  data: T[];
  pagination: Pagination;
};

// Generic query options for list operations
export type ListQuery = {
  limit?: number;
  offset?: number;
};

// Field filter type - partial entity fields for querying (excludes id and timestamps)
export type FieldFilter<T> = Partial<Omit<T, "id" | "created_at" | "updated_at">>;

// Generic Repository interface - defines standard CRUD operations
export type Repository<T extends Entity, TCreate, TUpdate> = {
  // Find single entity by id
  findById(id: number): Promise<T | null>;

  // Find single entity matching all provided field values
  findOneBy(fields: FieldFilter<T>): Promise<T | null>;

  // Find all entities matching provided field values with pagination
  findAllBy(fields: FieldFilter<T>, query?: ListQuery): Promise<ListResponse<T>>;

  // Create new entity
  create(data: TCreate & {group_id: number}): Promise<T>;

  // Update entity by id
  update(id: number, data: TUpdate): Promise<T | null>;

  // Delete entity by id
  delete(id: number): Promise<boolean>;
};
