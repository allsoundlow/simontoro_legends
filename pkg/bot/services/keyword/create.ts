import z from "zod";

import type {Keyword, PatternType} from "../../entities";
import {ConflictError} from "../../errors";
import {Base} from "../base";

const inputSchema = z.object({
  groupId: z.number().int().positive(),
  pattern: z.string().min(1).max(100),
  patternType: z.enum(["exact", "phrase", "wildcard"]).optional(),
  caseSensitive: z.boolean().optional(),
  cooldownSeconds: z.number().int().min(0).max(86400).optional(),
});

type Input = z.infer<typeof inputSchema>;

/**
 * Create a new keyword for a group.
 * Throws ConflictError if keyword with same pattern and type already exists.
 */
export class Create extends Base<Input, Keyword> {
  protected inputSchema = inputSchema;

  protected async checkPermissions(): Promise<void> {
    // Group ownership should be verified by caller
  }

  protected async execute(data: Input): Promise<Keyword> {
    const patternType: PatternType = data.patternType ?? "exact";

    const existing = await this.repos.keyword.findOneBy({
      group_id: data.groupId,
      pattern: data.pattern,
      pattern_type: patternType,
    });

    if (existing) {
      throw new ConflictError(
        `Keyword with pattern "${data.pattern}" and type "${patternType}" already exists`,
      );
    }

    const pk = await this.repos.keyword.create(data.groupId, {
      pattern: data.pattern,
      pattern_type: patternType,
      case_sensitive: data.caseSensitive,
      cooldown_seconds: data.cooldownSeconds,
    });

    const keyword = await this.repos.keyword.findById(pk);
    return keyword!;
  }
}
