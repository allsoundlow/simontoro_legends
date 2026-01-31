import z from "zod";

import type {Keyword} from "../../entities";
import {ConflictError, NotFoundError} from "../../errors";
import {Base} from "../base";

const inputSchema = z.object({
  groupId: z.number().int().positive(),
  keywordId: z.number().int().positive(),
  pattern: z.string().min(1).max(100).optional(),
  patternType: z.enum(["exact", "phrase", "wildcard"]).optional(),
  caseSensitive: z.boolean().optional(),
  cooldownSeconds: z.number().int().min(0).max(86400).optional(),
});

type Input = z.infer<typeof inputSchema>;

/**
 * Update a keyword.
 * Throws NotFoundError if keyword doesn't exist or belongs to different group.
 * Throws ConflictError if new pattern/type combination already exists.
 */
export class Update extends Base<Input, Keyword> {
  protected inputSchema = inputSchema;

  protected async checkPermissions(): Promise<void> {
    // Group ownership should be verified by caller
  }

  protected async execute(data: Input): Promise<Keyword> {
    const existing = await this.repos.keyword.findById(data.keywordId);

    if (!existing || existing.group_id !== data.groupId) {
      throw new NotFoundError(`Keyword ${data.keywordId} not found`);
    }

    // Check for duplicate if pattern/type changed
    const newPattern = data.pattern ?? existing.pattern;
    const newPatternType = data.patternType ?? existing.pattern_type;

    if (data.pattern !== undefined || data.patternType !== undefined) {
      const duplicate = await this.repos.keyword.findOneBy({
        group_id: data.groupId,
        pattern: newPattern,
        pattern_type: newPatternType,
      });

      if (duplicate && duplicate.pk !== data.keywordId) {
        throw new ConflictError(`Keyword with pattern "${newPattern}" already exists`);
      }
    }

    const updated = await this.repos.keyword.update(data.keywordId, {
      pattern: data.pattern,
      pattern_type: data.patternType,
      case_sensitive: data.caseSensitive,
      cooldown_seconds: data.cooldownSeconds,
    });

    if (!updated) {
      throw new NotFoundError(`Keyword ${data.keywordId} not found during update`);
    }

    return updated;
  }
}
