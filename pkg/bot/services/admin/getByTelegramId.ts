import z from "zod";

import type {Admin} from "../../entities";
import {Base} from "../base";

const inputSchema = z.object({
  telegramUserId: z.string(),
});

type Input = z.infer<typeof inputSchema>;

/**
 * Get an active admin by their Telegram user ID.
 * Throws NotFoundError if admin doesn't exist or is inactive.
 */
export class GetByTelegramId extends Base<Input, Admin> {
  protected inputSchema = inputSchema;

  protected async checkPermissions(): Promise<void> {
    // Self-service: user queries their own account
  }

  protected async execute(data: Input): Promise<Admin> {
    return await this.repos.admin.getActiveByTelegramId(data.telegramUserId);
  }
}
