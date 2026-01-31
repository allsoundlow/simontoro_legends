import z from "zod";

import type {Group} from "../../entities";
import {ConflictError} from "../../errors";
import {Base} from "../base";

const inputSchema = z.object({
  adminTelegramId: z.string(),
  telegramGroupId: z.string(),
  groupName: z.string(),
});

type Input = z.infer<typeof inputSchema>;

/**
 * Register a new group or reactivate an inactive one.
 * Throws NotFoundError if admin doesn't exist or is inactive.
 * Throws ConflictError if group is already active.
 */
export class Register extends Base<Input, Group> {
  protected inputSchema = inputSchema;

  protected async checkPermissions(): Promise<void> {
    // Admin ownership verified in execute via getActiveByTelegramId
  }

  protected async execute(data: Input): Promise<Group> {
    const admin = await this.repos.admin.getActiveByTelegramId(data.adminTelegramId);

    const existing = await this.repos.group.findByTelegramGroupId(data.telegramGroupId);
    if (existing) {
      if (existing.status === "active") {
        throw new ConflictError("This group is already registered");
      }
      const updated = await this.repos.group.update(existing.pk, {
        status: "active",
        group_name: data.groupName,
      });
      return updated!;
    }

    return await this.repos.group.create({
      telegram_group_id: data.telegramGroupId,
      group_name: data.groupName,
      admin_pk: admin.pk,
    });
  }
}
