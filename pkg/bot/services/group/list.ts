import z from "zod";

import type {GroupListItem} from "../../entities";
import {Base} from "../base";

const inputSchema = z.object({
  adminTelegramId: z.string(),
});

type Input = z.infer<typeof inputSchema>;

/**
 * List all groups owned by an admin.
 * Throws NotFoundError if admin doesn't exist or is inactive.
 */
export class List extends Base<Input, GroupListItem[]> {
  protected inputSchema = inputSchema;

  protected async checkPermissions(): Promise<void> {
    // Self-service: admin lists their own groups
  }

  protected async execute(data: Input): Promise<GroupListItem[]> {
    const admin = await this.repos.admin.getActiveByTelegramId(data.adminTelegramId);
    return await this.repos.group.findAllByAdminPk(admin.pk);
  }
}
