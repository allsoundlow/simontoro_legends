import {ConflictError, NotFoundError} from "../errors";
import type {AdminRepository} from "../repositories/admin.repository";
import type {GroupRepository} from "../repositories/group.repository";
import type {Group, GroupListItem} from "../schemas/group";

export class GroupService {
  constructor(
    private groupRepo: GroupRepository,
    private adminRepo: AdminRepository,
  ) {}

  async registerGroup(
    adminTelegramId: string,
    telegramGroupId: string,
    groupName: string,
  ): Promise<Group> {
    const admin = await this.adminRepo.getActiveByTelegramId(adminTelegramId);

    // Check if group already registered
    const existing = await this.groupRepo.findByTelegramGroupId(telegramGroupId);
    if (existing) {
      if (existing.status === "active") {
        throw new ConflictError("This group is already registered");
      }
      // Reactivate if previously registered but inactive/bot_removed
      const updated = await this.groupRepo.update(existing.pk, {
        status: "active",
        group_name: groupName,
      });
      return updated!;
    }

    // Create new group
    return await this.groupRepo.create({
      telegram_group_id: telegramGroupId,
      group_name: groupName,
      admin_pk: admin.pk,
    });
  }

  async listGroups(adminTelegramId: string): Promise<GroupListItem[]> {
    const admin = await this.adminRepo.getActiveByTelegramId(adminTelegramId);
    return await this.groupRepo.findAllByAdminPk(admin.pk);
  }

  async unregisterGroup(adminTelegramId: string, telegramGroupId: string): Promise<void> {
    const admin = await this.adminRepo.getActiveByTelegramId(adminTelegramId);

    const group = await this.groupRepo.findByTelegramGroupId(telegramGroupId);
    if (!group || group.admin_pk !== admin.pk) {
      throw new NotFoundError("Group not found or you don't have permission");
    }

    // Mark as inactive (preserve configuration)
    await this.groupRepo.update(group.pk, {status: "inactive"});
  }

  async markBotRemoved(telegramGroupId: string): Promise<void> {
    const group = await this.groupRepo.findByTelegramGroupId(telegramGroupId);
    if (group) {
      await this.groupRepo.update(group.pk, {status: "bot_removed"});
    }
  }

  async isGroupAdmin(adminTelegramId: string, telegramGroupId: string): Promise<boolean> {
    try {
      const admin = await this.adminRepo.getActiveByTelegramId(adminTelegramId);

      const group = await this.groupRepo.findByTelegramGroupId(telegramGroupId);

      return group.admin_pk === admin.pk;
    } catch (e) {
      return false;
    }
  }
}
