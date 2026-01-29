import {ConflictError} from "../errors";
import type {Admin} from "../schemas/admin";
import type {AdminRepository} from "../repositories/admin.repository";
import type {GroupRepository} from "../repositories/group.repository";

export class AdminService {
  constructor(
    private adminRepo: AdminRepository,
    private groupRepo: GroupRepository,
  ) {}

  async register(telegramUserId: string, telegramUsername: string | null): Promise<Admin> {
    const existing = await this.adminRepo.findByTelegramId(telegramUserId);

    if (existing) {
      if (existing.status === "inactive") {
        const updated = await this.adminRepo.update(existing.pk, {status: "active"});
        return updated!;
      }
      throw new ConflictError("You are already registered");
    }

    return await this.adminRepo.create({
      telegram_user_id: telegramUserId,
      telegram_username: telegramUsername,
    });
  }

  async getByTelegramId(telegramUserId: string): Promise<Admin> {
    return await this.adminRepo.getActiveByTelegramId(telegramUserId);
  }

  async getStatus(telegramUserId: string): Promise<{admin: Admin; groupCount: number}> {
    const admin = await this.adminRepo.getActiveByTelegramId(telegramUserId);
    const groupCount = await this.groupRepo.countByAdminPk(admin.pk);
    return {admin, groupCount};
  }

  async deleteAccount(telegramUserId: string): Promise<void> {
    const admin = await this.adminRepo.getActiveByTelegramId(telegramUserId);
    await this.groupRepo.markAllInactiveByAdminPk(admin.pk);
    await this.adminRepo.delete(admin.pk);
  }

  async updateUsername(telegramUserId: string, newUsername: string | null): Promise<void> {
    const admin = await this.adminRepo.findByTelegramId(telegramUserId);
    if (admin) {
      await this.adminRepo.update(admin.pk, {telegram_username: newUsername});
    }
  }
}
