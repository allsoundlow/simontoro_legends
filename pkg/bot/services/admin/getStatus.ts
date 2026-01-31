import z from "zod";

import type {Admin} from "../../entities";
import {Base} from "../base";

const inputSchema = z.object({
  telegramUserId: z.string(),
});

type Input = z.infer<typeof inputSchema>;

type Output = {
  admin: Admin;
  groupCount: number;
};

/**
 * Get admin status including their group count.
 * Throws NotFoundError if admin doesn't exist or is inactive.
 */
export class GetStatus extends Base<Input, Output> {
  protected inputSchema = inputSchema;

  protected async checkPermissions(): Promise<void> {
    // Self-service: user queries their own status
  }

  protected async execute(data: Input): Promise<Output> {
    const admin = await this.repos.admin.getActiveByTelegramId(data.telegramUserId);
    const groupCount = await this.repos.group.countActiveByAdminPk(admin.pk);
    return {admin, groupCount};
  }
}
