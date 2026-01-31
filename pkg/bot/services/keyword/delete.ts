import z from "zod";

import {NotFoundError} from "../../errors";
import {Base} from "../base";

const inputSchema = z.object({
  groupId: z.number().int().positive(),
  keywordId: z.number().int().positive(),
});

type Input = z.infer<typeof inputSchema>;

/**
 * Delete a keyword.
 * Throws NotFoundError if keyword doesn't exist or belongs to different group.
 */
export class Delete extends Base<Input, void> {
  protected inputSchema = inputSchema;

  protected async checkPermissions(): Promise<void> {
    // Group ownership should be verified by caller
  }

  protected async execute(data: Input): Promise<void> {
    const existing = await this.repos.keyword.findById(data.keywordId);

    if (!existing || existing.group_id !== data.groupId) {
      throw new NotFoundError(`Keyword ${data.keywordId} not found`);
    }

    const deleted = await this.repos.keyword.delete(data.keywordId);

    if (!deleted) {
      throw new NotFoundError(`Keyword ${data.keywordId} not found during delete`);
    }
  }
}
