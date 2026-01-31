import z from "zod";

import {Base} from "../base";

const inputSchema = z.object({
  adminTelegramId: z.string(),
  telegramGroupId: z.string(),
});

type Input = z.infer<typeof inputSchema>;

/**
 * Check if a user is the admin of a group.
 * Returns false if admin or group doesn't exist.
 */
export class IsAdmin extends Base<Input, boolean> {
  protected inputSchema = inputSchema;

  protected async checkPermissions(): Promise<void> {
    // Query operation, no special permissions needed
  }

  protected async execute(data: Input): Promise<boolean> {
      const admin = await this.repos.admin.getActiveByTelegramId(data.adminTelegramId);
      const group = await this.repos.group.findActiveByTelegramGroupId(data.telegramGroupId);

      if(!admin || !group){
        return false
      }
      return group.admin_pk === admin.pk;
  }
}
