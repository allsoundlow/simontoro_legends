import assert from "node:assert";
import {before, beforeEach, describe, it} from "node:test";

import {ConflictError, NotFoundError} from "../../errors";
import {AdminRepository} from "../../repositories/admin.repository";
import {GroupRepository} from "../../repositories/group.repository";
import type {Admin} from "../../schemas/admin";
import type {Group} from "../../schemas/group";
import {AdminService} from "../../services/admin.service";
import {InMemoryAdapter} from "../../storage/adapters/in-memory.adapter";

describe("AdminService", () => {
  let adminAdapter: InMemoryAdapter<Admin>;
  let groupAdapter: InMemoryAdapter<Group>;
  let adminRepo: AdminRepository;
  let groupRepo: GroupRepository;
  let adminService: AdminService;

  beforeEach(() => {
    adminAdapter = new InMemoryAdapter<Admin>();
    groupAdapter = new InMemoryAdapter<Group>();
    adminRepo = new AdminRepository(adminAdapter);
    groupRepo = new GroupRepository(groupAdapter);
    adminService = new AdminService(adminRepo, groupRepo);
  });

  describe("register", () => {
    it("should create a new administrator with correct fields", async () => {
      const telegramUserId = "123456789";
      const telegramUsername = "testuser";

      const admin = await adminService.register(telegramUserId, telegramUsername);

      assert.ok(admin.pk);
      assert.strictEqual(admin.telegram_user_id, telegramUserId);
      assert.strictEqual(admin.telegram_username, telegramUsername);
      assert.strictEqual(admin.status, "active");
      assert.ok(admin.created_at);
      assert.ok(admin.updated_at);
    });

    it("should throw ConflictError for already-registered user", async () => {
      const telegramUserId = "123456789";
      const telegramUsername = "testuser";

      await adminService.register(telegramUserId, telegramUsername);

      await assert.rejects(
        async () => await adminService.register(telegramUserId, telegramUsername),
        (error: Error) => {
          assert.ok(error instanceof ConflictError);
          assert.strictEqual(error.message, "You are already registered");
          return true;
        },
      );
    });

    it("should store null username when provided", async () => {
      const telegramUserId = "987654321";

      const admin = await adminService.register(telegramUserId, null);

      assert.strictEqual(admin.telegram_username, null);
      assert.strictEqual(admin.telegram_user_id, telegramUserId);
      assert.strictEqual(admin.status, "active");
    });

    it("should reactivate inactive admin instead of creating new", async () => {
      const telegramUserId = "111222333";
      const telegramUsername = "reactivateuser";

      // Register and then mark as inactive
      const originalAdmin = await adminService.register(telegramUserId, telegramUsername);
      await adminRepo.update(originalAdmin.pk, {status: "inactive"});

      // Re-register should reactivate
      const reactivatedAdmin = await adminService.register(telegramUserId, telegramUsername);

      assert.strictEqual(reactivatedAdmin.pk, originalAdmin.pk);
      assert.strictEqual(reactivatedAdmin.status, "active");
      assert.strictEqual(reactivatedAdmin.telegram_user_id, telegramUserId);
    });
  });

  describe("getByTelegramId", () => {
    it("should return correct admin when found", async () => {
      const telegramUserId = "555666777";
      const telegramUsername = "founduser";

      const created = await adminService.register(telegramUserId, telegramUsername);
      const found = await adminService.getByTelegramId(telegramUserId);

      assert.strictEqual(found.pk, created.pk);
      assert.strictEqual(found.telegram_user_id, telegramUserId);
      assert.strictEqual(found.telegram_username, telegramUsername);
    });

    it("should throw NotFoundError for non-existent admin", async () => {
      await assert.rejects(
        async () => await adminService.getByTelegramId("nonexistent123"),
        (error: Error) => {
          assert.ok(error instanceof NotFoundError);
          assert.strictEqual(error.message, "You are not registered. Use /register to get started.");
          return true;
        },
      );
    });

    it("should throw NotFoundError for inactive admin", async () => {
      const telegramUserId = "888999000";
      const telegramUsername = "inactiveuser";

      const admin = await adminService.register(telegramUserId, telegramUsername);
      await adminRepo.update(admin.pk, {status: "inactive"});

      await assert.rejects(
        async () => await adminService.getByTelegramId(telegramUserId),
        (error: Error) => {
          assert.ok(error instanceof NotFoundError);
          return true;
        },
      );
    });
  });

  describe("getStatus", () => {
    it("should return admin info with correct group count", async () => {
      const telegramUserId = "444555666";
      const telegramUsername = "statususer";

      const admin = await adminService.register(telegramUserId, telegramUsername);

      // Create some groups for this admin
      await groupRepo.create({
        telegram_group_id: "group1",
        group_name: "Test Group 1",
        admin_pk: admin.pk,
      });
      await groupRepo.create({
        telegram_group_id: "group2",
        group_name: "Test Group 2",
        admin_pk: admin.pk,
      });

      const status = await adminService.getStatus(telegramUserId);

      assert.strictEqual(status.admin.pk, admin.pk);
      assert.strictEqual(status.admin.telegram_user_id, telegramUserId);
      assert.strictEqual(status.groupCount, 2);
    });

    it("should return zero group count for admin with no groups", async () => {
      const telegramUserId = "777888999";
      const telegramUsername = "nogroupsuser";

      await adminService.register(telegramUserId, telegramUsername);

      const status = await adminService.getStatus(telegramUserId);

      assert.strictEqual(status.groupCount, 0);
    });

    it("should throw NotFoundError for non-registered user", async () => {
      await assert.rejects(
        async () => await adminService.getStatus("nonexistent456"),
        (error: Error) => {
          assert.ok(error instanceof NotFoundError);
          return true;
        },
      );
    });
  });

  describe("deleteAccount", () => {
    it("should remove admin and mark all groups as inactive", async () => {
      const telegramUserId = "111333555";
      const telegramUsername = "deleteuser";

      const admin = await adminService.register(telegramUserId, telegramUsername);

      // Create groups for this admin
      const group1 = await groupRepo.create({
        telegram_group_id: "deletegroup1",
        group_name: "Delete Group 1",
        admin_pk: admin.pk,
      });
      const group2 = await groupRepo.create({
        telegram_group_id: "deletegroup2",
        group_name: "Delete Group 2",
        admin_pk: admin.pk,
      });

      await adminService.deleteAccount(telegramUserId);

      // Verify admin is deleted
      const deletedAdmin = await adminRepo.findByTelegramId(telegramUserId);
      assert.strictEqual(deletedAdmin, null);

      // Verify groups are marked inactive (not deleted)
      const updatedGroup1 = await groupRepo.findById(group1.pk);
      const updatedGroup2 = await groupRepo.findById(group2.pk);
      assert.strictEqual(updatedGroup1?.status, "inactive");
      assert.strictEqual(updatedGroup2?.status, "inactive");
    });

    it("should throw NotFoundError for non-registered user", async () => {
      await assert.rejects(
        async () => await adminService.deleteAccount("nonexistent789"),
        (error: Error) => {
          assert.ok(error instanceof NotFoundError);
          return true;
        },
      );
    });
  });

  describe("updateUsername", () => {
    it("should update username for existing admin", async () => {
      const telegramUserId = "222444666";
      const originalUsername = "originalname";
      const newUsername = "newname";

      await adminService.register(telegramUserId, originalUsername);
      await adminService.updateUsername(telegramUserId, newUsername);

      const admin = await adminRepo.findByTelegramId(telegramUserId);
      assert.strictEqual(admin?.telegram_username, newUsername);
    });

    it("should handle null username update", async () => {
      const telegramUserId = "333555777";
      const originalUsername = "hasusername";

      await adminService.register(telegramUserId, originalUsername);
      await adminService.updateUsername(telegramUserId, null);

      const admin = await adminRepo.findByTelegramId(telegramUserId);
      assert.strictEqual(admin?.telegram_username, null);
    });

    it("should do nothing for non-existent admin", async () => {
      // Should not throw, just silently do nothing
      await adminService.updateUsername("nonexistent000", "newname");
      // No assertion needed - just verify it doesn't throw
    });
  });
});
