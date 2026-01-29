import type {Entity, FieldFilter, InsertData, ListQuery, ListResult, StorageAdapter, UpdateData} from "../adapter";

export class InMemoryAdapter<T extends Entity> implements StorageAdapter<T> {
  private items: Map<number, T> = new Map();
  private nextPk = 1;

  async get(pk: number): Promise<T | null> {
    return this.items.get(pk) ?? null;
  }

  async getOneByFields(fields: FieldFilter<T>): Promise<T | null> {
    for (const item of this.items.values()) {
      if (this.matchesFields(item, fields)) {
        return item;
      }
    }
    return null;
  }

  async getAllByFields(fields: FieldFilter<T>, query: ListQuery = {}): Promise<ListResult<T>> {
    const {limit = 50, offset = 0} = query;
    const filtered = Array.from(this.items.values()).filter((item) =>
      this.matchesFields(item, fields),
    );
    return {
      data: filtered.slice(offset, offset + limit),
      pagination: {total: filtered.length, limit, offset},
    };
  }

  async insert(data: InsertData<T>): Promise<number> {
    const now = new Date().toISOString();
    const item = {
      pk: this.nextPk++,
      ...data,
      created_at: now,
      updated_at: now,
    } as T;
    this.items.set(item.pk, item);
    return item.pk;
  }

  async update(pk: number, data: UpdateData<T>): Promise<number | null> {
    const existing = this.items.get(pk);
    if (!existing) return null;
    const updated = {
      ...existing,
      ...data,
      updated_at: new Date().toISOString(),
    } as T;
    this.items.set(pk, updated);
    return pk;
  }

  async remove(pk: number): Promise<boolean> {
    return this.items.delete(pk);
  }

  async count(fields: FieldFilter<T>): Promise<number> {
    let count = 0;
    for (const item of this.items.values()) {
      if (this.matchesFields(item, fields)) count++;
    }
    return count;
  }

  private matchesFields(item: T, fields: FieldFilter<T>): boolean {
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined && item[key as keyof T] !== value) {
        return false;
      }
    }
    return true;
  }
}
