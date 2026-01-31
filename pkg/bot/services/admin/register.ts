import z from "zod";

import type {Admin} from "../../entities";
import {ConflictError} from "../../errors";
import {Base} from "../base";

const inputSchema = z.object({
  telegramUserId: z.string(),
  telegramUsername: z.string().nullable().optional(),
});

type Input = z.infer<typeof inputSchema>;

/**
 * Register a new admin or reactivate an inactive one.
 */
export class Register extends Base<Input, Admin> {
  protected inputSchema = inputSchema;

  protected async checkPermissions(): Promise<void> {
    // Registration is open to anyone
  }

  protected async execute(data: Input): Promise<Admin> {
    const existing = await this.repos.admin.findByTelegramId(data.telegramUserId);

    if (existing) {
      if (existing.status === "inactive") {
        const updated = await this.repos.admin.update(existing.pk, {status: "active"});
        return updated!;
      }
      throw new ConflictError("You are already registered");
    }

    return await this.repos.admin.create({
      telegram_user_id: data.telegramUserId,
      telegram_username: data.telegramUsername,
    });
  }
}
