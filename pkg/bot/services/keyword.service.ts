import {ConflictError, NotFoundError} from "../errors";
import type {KeywordRepository} from "../repositories/keyword.repository";
import type {
  CreateKeywordRequest,
  Keyword,
  KeywordListResponse,
  ListKeywordsQuery,
  UpdateKeywordRequest,
} from "../schemas/keyword";

export type ServiceError = {
  type: "not_found" | "conflict";
  message: string;
};

export type ServiceResult<T> = {ok: true; data: T};

// KeywordService class with business logic
export class KeywordService {
  constructor(private repo: KeywordRepository) {}

  async create(groupId: number, data: CreateKeywordRequest): Promise<ServiceResult<Keyword>> {
    // Business logic: check for duplicate pattern
    const patternType = data.pattern_type ?? "exact";
    const existing = await this.repo.findOneBy({
      group_id: groupId,
      pattern: data.pattern,
      pattern_type: patternType,
    });
    if (existing) {
      throw new ConflictError(`Keyword with pattern "${data.pattern}" and type "${patternType}" already exists`)
    }

    const pk = await this.repo.create(groupId, data);
    const keyword = await this.repo.findById(pk);
    return {ok: true, data: keyword!};
  }

  async list(groupId: number, query: ListKeywordsQuery): Promise<ServiceResult<KeywordListResponse>> {
    const {pattern_type, ...pagination} = query;
    const fields = pattern_type ? {group_id: groupId, pattern_type} : {group_id: groupId};
    const result = await this.repo.findAllBy(fields, pagination);
    return {ok: true, data: result};
  }

  async getById(groupId: number, keywordId: number): Promise<ServiceResult<Keyword>> {
    const keyword = await this.repo.findById(keywordId);
    if (!keyword || keyword.group_id !== groupId) {
      throw new NotFoundError(`Keyword ${keywordId} not found`)
    }
    return {ok: true, data: keyword};
  }

  async update(
    groupId: number,
    keywordId: number,
    data: UpdateKeywordRequest,
  ): Promise<ServiceResult<Keyword>> {
    const existing = await this.repo.findById(keywordId);
    if (!existing || existing.group_id !== groupId) {
      throw new NotFoundError(`Keyword ${keywordId} not found`)
    }

    // Business logic: check for duplicate if pattern/type changed
    const newPattern = data.pattern ?? existing.pattern;
    const newPatternType = data.pattern_type ?? existing.pattern_type;
    if (data.pattern !== undefined || data.pattern_type !== undefined) {
      const duplicate = await this.repo.findOneBy({
        group_id: groupId,
        pattern: newPattern,
        pattern_type: newPatternType,
      });
      if (duplicate && duplicate.pk !== keywordId) {
        throw new ConflictError(`Keyword with pattern "${newPattern}" already exists`)
      }
    }

    const pk = await this.repo.update(keywordId, data);
    if (pk === null) {
      throw new NotFoundError(`Keyword ${keywordId} not found during update`);
    }
    const updated = await this.repo.findById(pk);
    return {ok: true, data: updated!};
  }

  async delete(groupId: number, keywordId: number): Promise<ServiceResult<void>> {
    const existing = await this.repo.findById(keywordId);
    if (!existing || existing.group_id !== groupId) {
      throw new NotFoundError(`Keyword ${keywordId} not found`)
    }

    const deleted = await this.repo.delete(keywordId);
    if (!deleted) {
      throw new NotFoundError(`Keyword ${keywordId} not found during delete`);
    }
    return {ok: true, data: undefined};
  }
}
