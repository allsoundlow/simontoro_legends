import type {CreateGroup, Group, GroupListItem, UpdateGroup} from "../entities";
import type {StorageAdapter} from "../storage/adapter";

export class GroupRepository {
  constructor(private storage: StorageAdapter<Group>) {}

  async findById(pk: number): Promise<Group | null> {
    return await this.storage.get(pk);
  }

  async findByTelegramGroupId(telegramGroupId: string, adminPk?: number): Promise<Group | null> {
    return await this.storage.getOneByFields({
      telegram_group_id: telegramGroupId,
      admin_pk: adminPk,
    });
  }

  async findActiveByTelegramGroupId(telegramGroupId: string): Promise<Group | null> {
    const group = await this.storage.getOneByFields({
      telegram_group_id: telegramGroupId,
      status: "active",
    });
    return group;
  }

  async findAllByAdminPk(adminPk: number): Promise<GroupListItem[]> {
    const result = await this.storage.getAllByFields({admin_pk: adminPk});
    return result.data.map((group) => ({
      pk: group.pk,
      telegram_group_id: group.telegram_group_id,
      group_name: group.group_name,
      status: group.status,
      created_at: group.created_at,
    }));
  }

  async countByAdminPk(adminPk: number): Promise<number> {
    return await this.storage.count({admin_pk: adminPk});
  }

  async countActiveByAdminPk(adminPk: number): Promise<number> {
    return await this.storage.count({admin_pk: adminPk, status: "active"});
  }

  async create(data: CreateGroup): Promise<Group> {
    const pk = await this.storage.insert({
      telegram_group_id: data.telegram_group_id,
      group_name: data.group_name,
      admin_pk: data.admin_pk,
      status: "active",
    });
    const group = await this.storage.get(pk);
    return group!;
  }

  async update(pk: number, data: UpdateGroup): Promise<Group | null> {
    const updatedPk = await this.storage.update(pk, data);
    if (!updatedPk) {
      return null;
    }
    return await this.storage.get(updatedPk);
  }

  async delete(pk: number): Promise<boolean> {
    return await this.storage.remove(pk);
  }

  async deleteAllByAdminPk(adminPk: number): Promise<number> {
    const groups = await this.storage.getAllByFields({admin_pk: adminPk});
    let deletedCount = 0;
    for (const group of groups.data) {
      const deleted = await this.storage.remove(group.pk);
      if (deleted) {
        deletedCount++;
      }
    }
    return deletedCount;
  }

  async markAllInactiveByAdminPk(adminPk: number): Promise<number> {
    const groups = await this.storage.getAllByFields({admin_pk: adminPk});
    let updatedCount = 0;
    for (const group of groups.data) {
      if (group.status !== "inactive") {
        const updated = await this.storage.update(group.pk, {status: "inactive"});
        if (updated !== null) {
          updatedCount++;
        }
      }
    }
    return updatedCount;
  }
}
