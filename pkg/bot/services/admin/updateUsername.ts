import z from "zod";

import {Base} from "../base";

const inputSchema = z.object({
  telegramUserId: z.string(),
  newUsername: z.string().nullable(),
});

type Input = z.infer<typeof inputSchema>;

/**
 * Update an admin's Telegram username.
 * No-op if admin doesn't exist.
 */
export class UpdateUsername extends Base<Input, void> {
  protected inputSchema = inputSchema;

  protected async checkPermissions(): Promise<void> {
    // Self-service: user updates their own username
  }

  protected async execute(data: Input): Promise<void> {
    const admin = await this.repos.admin.findByTelegramId(data.telegramUserId);
    if (admin) {
      await this.repos.admin.update(admin.pk, {telegram_username: data.newUsername});
    }
  }
}
