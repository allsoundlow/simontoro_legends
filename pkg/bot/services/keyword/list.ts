import z from "zod";

import type {Keyword} from "../../entities";
import type {ListResult} from "../../storage";
import {Base} from "../base";

const inputSchema = z.object({
  groupId: z.number().int().positive(),
  patternType: z.enum(["exact", "phrase", "wildcard"]).optional(),
  limit: z.number().int().positive().max(100).optional(),
  offset: z.number().int().min(0).optional(),
});

type Input = z.infer<typeof inputSchema>;

/**
 * List keywords for a group with optional filtering and pagination.
 */
export class List extends Base<Input, ListResult<Keyword>> {
  protected inputSchema = inputSchema;

  protected async checkPermissions(): Promise<void> {
    // Group ownership should be verified by caller
  }

  protected async execute(data: Input): Promise<ListResult<Keyword>> {
    const fields = data.patternType
      ? {group_id: data.groupId, pattern_type: data.patternType}
      : {group_id: data.groupId};

    return await this.repos.keyword.findAllBy(fields, {
      limit: data.limit,
      offset: data.offset,
    });
  }
}
