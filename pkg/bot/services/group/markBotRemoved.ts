import z from "zod";

import {Base} from "../base";

const inputSchema = z.object({
  telegramGroupId: z.string(),
});

type Input = z.infer<typeof inputSchema>;

/**
 * Mark a group as bot_removed (when bot is kicked from group).
 * No-op if group doesn't exist.
 */
export class MarkBotRemoved extends Base<Input, void> {
  protected inputSchema = inputSchema;

  protected async checkPermissions(): Promise<void> {
    // System operation triggered by Telegram webhook
  }

  protected async execute(data: Input): Promise<void> {
    const group = await this.repos.group.findByTelegramGroupId(data.telegramGroupId);
    if (group) {
      await this.repos.group.update(group.pk, {status: "bot_removed"});
    }
  }
}
