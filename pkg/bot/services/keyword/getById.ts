import z from "zod";

import type {Keyword} from "../../entities";
import {NotFoundError} from "../../errors";
import {Base} from "../base";

const inputSchema = z.object({
  groupId: z.number().int().positive(),
  keywordId: z.number().int().positive(),
});

type Input = z.infer<typeof inputSchema>;

/**
 * Get a keyword by ID.
 * Throws NotFoundError if keyword doesn't exist or belongs to different group.
 */
export class GetById extends Base<Input, Keyword> {
  protected inputSchema = inputSchema;

  protected async checkPermissions(): Promise<void> {
    // Group ownership should be verified by caller
  }

  protected async execute(data: Input): Promise<Keyword> {
    const keyword = await this.repos.keyword.findById(data.keywordId);

    if (!keyword || keyword.group_id !== data.groupId) {
      throw new NotFoundError(`Keyword ${data.keywordId} not found`);
    }

    return keyword;
  }
}
