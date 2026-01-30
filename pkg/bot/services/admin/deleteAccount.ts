import z from "zod";

import {Base} from "../base";

const inputSchema = z.object({
  telegramUserId: z.string(),
});

type Input = z.infer<typeof inputSchema>;

/**
 * Delete an admin account and mark all their groups as inactive.
 * Throws NotFoundError if admin doesn't exist or is inactive.
 */
export class DeleteAccount extends Base<Input, void> {
  protected inputSchema = inputSchema;

  protected async checkPermissions(): Promise<void> {
    // Self-service: user deletes their own account
  }

  protected async execute(data: Input): Promise<void> {
    const admin = await this.repos.admin.getActiveByTelegramId(data.telegramUserId);
    await this.repos.group.markAllInactiveByAdminPk(admin.pk);
    await this.repos.admin.delete(admin.pk);
  }
}
