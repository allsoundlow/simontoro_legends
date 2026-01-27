import type {CreateKeywordRequest, Keyword, UpdateKeywordRequest} from "../schemas/keyword";
import type {FieldFilter, ListQuery, ListResponse, Repository} from "./repository";

// KeywordRepository is a Repository specialized for Keyword entity
export type KeywordRepository = Repository<Keyword, CreateKeywordRequest, UpdateKeywordRequest>;

// In-memory implementation for testing
export class InMemoryKeywordRepository implements KeywordRepository {
  private keywords: Map<number, Keyword> = new Map();
  private nextId = 1;

  async findById(id: number): Promise<Keyword | null> {
    return this.keywords.get(id) ?? null;
  }

  async findOneBy(fields: FieldFilter<Keyword>): Promise<Keyword | null> {
    for (const keyword of this.keywords.values()) {
      if (this.matchesFields(keyword, fields)) {
        return keyword;
      }
    }
    return null;
  }

  async findAllBy(
    fields: FieldFilter<Keyword>,
    query: ListQuery = {},
  ): Promise<ListResponse<Keyword>> {
    const {limit = 50, offset = 0} = query;
    const filtered = Array.from(this.keywords.values()).filter((k) => this.matchesFields(k, fields));
    return {
      data: filtered.slice(offset, offset + limit),
      pagination: {total: filtered.length, limit, offset},
    };
  }

  async create(data: CreateKeywordRequest & {group_id: number}): Promise<Keyword> {
    const now = new Date().toISOString();
    const keyword: Keyword = {
      id: this.nextId++,
      group_id: data.group_id,
      pattern: data.pattern,
      pattern_type: data.pattern_type ?? "exact",
      case_sensitive: data.case_sensitive ?? false,
      cooldown_seconds: data.cooldown_seconds ?? 0,
      created_at: now,
      updated_at: now,
    };
    this.keywords.set(keyword.id, keyword);
    return keyword;
  }

  async update(id: number, data: UpdateKeywordRequest): Promise<Keyword | null> {
    const existing = this.keywords.get(id);
    if (!existing) return null;
    const updated: Keyword = {
      ...existing,
      ...data,
      updated_at: new Date().toISOString(),
    };
    this.keywords.set(id, updated);
    return updated;
  }

  async delete(id: number): Promise<boolean> {
    return this.keywords.delete(id);
  }

  // Helper to check if entity matches all provided field values
  private matchesFields(entity: Keyword, fields: FieldFilter<Keyword>): boolean {
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined && entity[key as keyof Keyword] !== value) {
        return false;
      }
    }
    return true;
  }
}
