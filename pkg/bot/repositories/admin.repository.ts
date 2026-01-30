import type {Admin, CreateAdmin, UpdateAdmin} from "../entities";
import {NotFoundError} from "../errors";
import type {StorageAdapter} from "../storage/adapter";

export class AdminRepository {
  constructor(private storage: StorageAdapter<Admin>) {}

  async findById(pk: number): Promise<Admin | null> {
    return await this.storage.get(pk);
  }

  async findByTelegramId(telegramUserId: string): Promise<Admin | null> {
    return await this.storage.getOneByFields({telegram_user_id: telegramUserId});
  }

  async getActiveByTelegramId(telegramUserId: string): Promise<Admin> {
    const admin = await this.storage.getOneByFields({
      telegram_user_id: telegramUserId,
      status: "active",
    });
    if (!admin) {
      throw new NotFoundError("You are not registered. Use /register to get started.");
    }
    return admin;
  }

  async create(data: CreateAdmin): Promise<Admin> {
    const pk = await this.storage.insert({
      telegram_user_id: data.telegram_user_id,
      telegram_username: data.telegram_username,
      status: "active",
    });
    const admin = await this.storage.get(pk);
    return admin!;
  }

  async update(pk: number, data: UpdateAdmin): Promise<Admin | null> {
    if (Object.keys(data).length === 0) {
      return await this.storage.get(pk);
    }
    const updatedPk = await this.storage.update(pk, data);
    if (updatedPk === null) {
      return null;
    }
    return await this.storage.get(updatedPk);
  }

  async delete(pk: number): Promise<boolean> {
    return await this.storage.remove(pk);
  }
}
