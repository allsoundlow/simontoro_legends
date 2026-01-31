import z from "zod";

import {NotFoundError} from "../../errors";
import {Base} from "../base";

const inputSchema = z.object({
  adminTelegramId: z.string(),
  telegramGroupId: z.string(),
});

type Input = z.infer<typeof inputSchema>;

/**
 * Unregister a group (mark as inactive).
 * Throws NotFoundError if admin doesn't exist, is inactive, or doesn't own the group.
 */
export class Unregister extends Base<Input, void> {
  protected inputSchema = inputSchema;

  protected async checkPermissions(): Promise<void> {
    // Ownership verified in execute
  }

  protected async execute(data: Input): Promise<void> {
    const admin = await this.repos.admin.getActiveByTelegramId(data.adminTelegramId);

    const group = await this.repos.group.findByTelegramGroupId(data.telegramGroupId);
    if (!group || group.admin_pk !== admin.pk) {
      throw new NotFoundError("Group not found or you don't have permission");
    }

    await this.repos.group.update(group.pk, {status: "inactive"});
  }
}
