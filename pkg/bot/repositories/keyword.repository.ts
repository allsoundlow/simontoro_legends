import type {CreateKeywordRequest, Keyword, UpdateKeywordRequest} from "../schemas/keyword";
import type {
  FieldFilter,
  ListQuery,
  ListResult,
  StorageAdapter,
} from "../storage/adapter";

export class KeywordRepository {
  constructor(private storage: StorageAdapter<Keyword>) {}

  async findById(pk: number): Promise<Keyword | null> {
    return this.storage.get(pk);
  }

  async findByGroupId(groupId: number, query?: ListQuery): Promise<ListResult<Keyword>> {
    return this.storage.getAllByFields({group_id: groupId}, query);
  }

  async findByPattern(groupId: number, pattern: string): Promise<Keyword | null> {
    return this.storage.getOneByFields({group_id: groupId, pattern});
  }

  async findOneBy(fields: FieldFilter<Keyword>): Promise<Keyword | null> {
    return this.storage.getOneByFields(fields);
  }

  async findAllBy(
    fields: FieldFilter<Keyword>,
    query?: ListQuery,
  ): Promise<ListResult<Keyword>> {
    return this.storage.getAllByFields(fields, query);
  }

  async create(groupId: number, data: CreateKeywordRequest): Promise<number> {
    const now = new Date().toISOString();
    return this.storage.insert({
      group_id: groupId,
      pattern: data.pattern,
      pattern_type: data.pattern_type ?? "exact",
      case_sensitive: data.case_sensitive ?? false,
      cooldown_seconds: data.cooldown_seconds ?? 0,
      created_at: now,
      updated_at: now,
    });
  }

  async update(pk: number, data: UpdateKeywordRequest): Promise<number | null> {
    if (Object.keys(data).length === 0) {
      return pk;
    }
    return this.storage.update(pk, {
      ...data,
      updated_at: new Date().toISOString(),
    });
  }

  async delete(pk: number): Promise<boolean> {
    return this.storage.remove(pk);
  }

  async countByGroup(groupId: number): Promise<number> {
    return this.storage.count({group_id: groupId});
  }
}
