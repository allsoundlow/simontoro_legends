import assert from "node:assert";
import {beforeEach, describe, it} from "node:test";

import {ConflictError, NotFoundError} from "../../errors";
import {AdminRepository} from "../../repositories/admin.repository";
import {GroupRepository} from "../../repositories/group.repository";
import type {Admin} from "../../schemas/admin";
import type {Group} from "../../schemas/group";
import {GroupService} from "../../services/group.service";
import {InMemoryAdapter} from "../../storage/adapters/in-memory.adapter";

describe("GroupService", () => {
  let adminAdapter: InMemoryAdapter<Admin>;
  let groupAdapter: InMemoryAdapter<Group>;
  let adminRepo: AdminRepository;
  let groupRepo: GroupRepository;
  let groupService: GroupService;

  beforeEach(() => {
    adminAdapter = new InMemoryAdapter<Admin>();
    groupAdapter = new InMemoryAdapter<Group>();
    adminRepo = new AdminRepository(adminAdapter);
    groupRepo = new GroupRepository(groupAdapter);
    groupService = new GroupService(groupRepo, adminRepo);
  });

  // Helper to create a registered admin
  async function createAdmin(telegramUserId: string, username: string | null = null): Promise<Admin> {
    return await adminRepo.create({
      telegram_user_id: telegramUserId,
      telegram_username: username,
    });
  }

  describe("registerGroup", () => {
    it("should create group with correct admin_pk", async () => {
      const admin = await createAdmin("123456789", "testadmin");
      const telegramGroupId = "-1001234567890";
      const groupName = "Test Group";

      const group = await groupService.registerGroup(admin.telegram_user_id, telegramGroupId, groupName);

      assert.ok(group.pk);
      assert.strictEqual(group.telegram_group_id, telegramGroupId);
      assert.strictEqual(group.group_name, groupName);
      assert.strictEqual(group.admin_pk, admin.pk);
      assert.strictEqual(group.status, "active");
      assert.ok(group.created_at);
      assert.ok(group.updated_at);
    });

    it("should throw NotFoundError for non-registered user", async () => {
      const telegramGroupId = "-1001234567890";
      const groupName = "Test Group";

      await assert.rejects(
        async () => await groupService.registerGroup("nonexistent123", telegramGroupId, groupName),
        (error: Error) => {
          assert.ok(error instanceof NotFoundError);
          assert.strictEqual(error.message, "You are not registered. Use /register to get started.");
          return true;
        },
      );
    });

    it("should throw ConflictError for already-registered active group", async () => {
      const admin = await createAdmin("123456789", "testadmin");
      const telegramGroupId = "-1001234567890";
      const groupName = "Test Group";

      await groupService.registerGroup(admin.telegram_user_id, telegramGroupId, groupName);

      await assert.rejects(
        async () => await groupService.registerGroup(admin.telegram_user_id, telegramGroupId, "Another Name"),
        (error: Error) => {
          assert.ok(error instanceof ConflictError);
          assert.strictEqual(error.message, "This group is already registered");
          return true;
        },
      );
    });

    it("should reactivate inactive group instead of creating new", async () => {
      const admin = await createAdmin("123456789", "testadmin");
      const telegramGroupId = "-1001234567890";
      const originalName = "Original Name";
      const newName = "New Name";

      // Create and then mark as inactive
      const originalGroup = await groupService.registerGroup(admin.telegram_user_id, telegramGroupId, originalName);
      await groupRepo.update(originalGroup.pk, {status: "inactive"});

      // Re-register should reactivate
      const reactivatedGroup = await groupService.registerGroup(admin.telegram_user_id, telegramGroupId, newName);

      assert.strictEqual(reactivatedGroup.pk, originalGroup.pk);
      assert.strictEqual(reactivatedGroup.status, "active");
      assert.strictEqual(reactivatedGroup.group_name, newName);
    });

    it("should reactivate bot_removed group instead of creating new", async () => {
      const admin = await createAdmin("123456789", "testadmin");
      const telegramGroupId = "-1001234567890";
      const groupName = "Test Group";

      // Create and then mark as bot_removed
      const originalGroup = await groupService.registerGroup(admin.telegram_user_id, telegramGroupId, groupName);
      await groupRepo.update(originalGroup.pk, {status: "bot_removed"});

      // Re-register should reactivate
      const reactivatedGroup = await groupService.registerGroup(admin.telegram_user_id, telegramGroupId, groupName);

      assert.strictEqual(reactivatedGroup.pk, originalGroup.pk);
      assert.strictEqual(reactivatedGroup.status, "active");
    });
  });

  describe("listGroups", () => {
    it("should return all groups with complete info", async () => {
      const admin = await createAdmin("123456789", "testadmin");

      const group1 = await groupService.registerGroup(admin.telegram_user_id, "-1001111111111", "Group One");
      const group2 = await groupService.registerGroup(admin.telegram_user_id, "-1002222222222", "Group Two");

      const groups = await groupService.listGroups(admin.telegram_user_id);

      assert.strictEqual(groups.length, 2);

      // Verify complete info for each group
      const groupIds = groups.map((g) => g.telegram_group_id);
      assert.ok(groupIds.includes("-1001111111111"));
      assert.ok(groupIds.includes("-1002222222222"));

      for (const group of groups) {
        assert.ok(group.pk);
        assert.ok(group.telegram_group_id);
        assert.ok(group.group_name);
        assert.ok(group.status);
        assert.ok(group.created_at);
      }
    });

    it("should return empty array for admin with no groups", async () => {
      const admin = await createAdmin("123456789", "testadmin");

      const groups = await groupService.listGroups(admin.telegram_user_id);

      assert.ok(Array.isArray(groups));
      assert.strictEqual(groups.length, 0);
    });

    it("should throw NotFoundError for non-registered user", async () => {
      await assert.rejects(
        async () => await groupService.listGroups("nonexistent123"),
        (error: Error) => {
          assert.ok(error instanceof NotFoundError);
          return true;
        },
      );
    });
  });

  describe("unregisterGroup", () => {
    it("should change status to inactive", async () => {
      const admin = await createAdmin("123456789", "testadmin");
      const telegramGroupId = "-1001234567890";

      const group = await groupService.registerGroup(admin.telegram_user_id, telegramGroupId, "Test Group");
      assert.strictEqual(group.status, "active");

      await groupService.unregisterGroup(admin.telegram_user_id, telegramGroupId);

      const updatedGroup = await groupRepo.findById(group.pk);
      assert.strictEqual(updatedGroup?.status, "inactive");
      // Verify data is preserved
      assert.strictEqual(updatedGroup?.telegram_group_id, telegramGroupId);
      assert.strictEqual(updatedGroup?.group_name, "Test Group");
      assert.strictEqual(updatedGroup?.admin_pk, admin.pk);
    });

    it("should throw NotFoundError when admin tries to unregister another admin's group", async () => {
      const admin1 = await createAdmin("111111111", "admin1");
      const admin2 = await createAdmin("222222222", "admin2");
      const telegramGroupId = "-1001234567890";

      // Admin1 registers the group
      await groupService.registerGroup(admin1.telegram_user_id, telegramGroupId, "Admin1 Group");

      // Admin2 tries to unregister it
      await assert.rejects(
        async () => await groupService.unregisterGroup(admin2.telegram_user_id, telegramGroupId),
        (error: Error) => {
          assert.ok(error instanceof NotFoundError);
          assert.strictEqual(error.message, "Group not found or you don't have permission");
          return true;
        },
      );
    });

    it("should throw NotFoundError for non-existent group", async () => {
      const admin = await createAdmin("123456789", "testadmin");

      await assert.rejects(
        async () => await groupService.unregisterGroup(admin.telegram_user_id, "-9999999999"),
        (error: Error) => {
          assert.ok(error instanceof NotFoundError);
          return true;
        },
      );
    });
  });

  describe("markBotRemoved", () => {
    it("should change status to bot_removed", async () => {
      const admin = await createAdmin("123456789", "testadmin");
      const telegramGroupId = "-1001234567890";

      const group = await groupService.registerGroup(admin.telegram_user_id, telegramGroupId, "Test Group");
      assert.strictEqual(group.status, "active");

      await groupService.markBotRemoved(telegramGroupId);

      const updatedGroup = await groupRepo.findById(group.pk);
      assert.strictEqual(updatedGroup?.status, "bot_removed");
      // Verify data is preserved
      assert.strictEqual(updatedGroup?.telegram_group_id, telegramGroupId);
      assert.strictEqual(updatedGroup?.group_name, "Test Group");
    });

    it("should do nothing for non-existent group", async () => {
      // Should not throw, just silently do nothing
      await groupService.markBotRemoved("-9999999999");
      // No assertion needed - just verify it doesn't throw
    });
  });

  describe("isGroupAdmin", () => {
    it("should return true when admin owns the group", async () => {
      const admin = await createAdmin("123456789", "testadmin");
      const telegramGroupId = "-1001234567890";

      await groupService.registerGroup(admin.telegram_user_id, telegramGroupId, "Test Group");

      const isAdmin = await groupService.isGroupAdmin(admin.telegram_user_id, telegramGroupId);
      assert.strictEqual(isAdmin, true);
    });

    it("should return false when admin does not own the group", async () => {
      const admin1 = await createAdmin("111111111", "admin1");
      const admin2 = await createAdmin("222222222", "admin2");
      const telegramGroupId = "-1001234567890";

      await groupService.registerGroup(admin1.telegram_user_id, telegramGroupId, "Admin1 Group");

      const isAdmin = await groupService.isGroupAdmin(admin2.telegram_user_id, telegramGroupId);
      assert.strictEqual(isAdmin, false);
    });

    it("should return false for non-registered user", async () => {
      const admin = await createAdmin("123456789", "testadmin");
      const telegramGroupId = "-1001234567890";

      await groupService.registerGroup(admin.telegram_user_id, telegramGroupId, "Test Group");

      const isAdmin = await groupService.isGroupAdmin("nonexistent123", telegramGroupId);
      assert.strictEqual(isAdmin, false);
    });

    it("should return false for non-existent group", async () => {
      const admin = await createAdmin("123456789", "testadmin");

      const isAdmin = await groupService.isGroupAdmin(admin.telegram_user_id, "-9999999999");
      assert.strictEqual(isAdmin, false);
    });
  });

  describe("group isolation", () => {
    it("should ensure admin cannot access other admin's groups in listGroups", async () => {
      const admin1 = await createAdmin("111111111", "admin1");
      const admin2 = await createAdmin("222222222", "admin2");

      // Admin1 creates groups
      await groupService.registerGroup(admin1.telegram_user_id, "-1001111111111", "Admin1 Group 1");
      await groupService.registerGroup(admin1.telegram_user_id, "-1001111111112", "Admin1 Group 2");

      // Admin2 creates groups
      await groupService.registerGroup(admin2.telegram_user_id, "-1002222222221", "Admin2 Group 1");

      // Admin1 should only see their own groups
      const admin1Groups = await groupService.listGroups(admin1.telegram_user_id);
      assert.strictEqual(admin1Groups.length, 2);
      for (const group of admin1Groups) {
        assert.ok(group.telegram_group_id.startsWith("-100111111111"));
      }

      // Admin2 should only see their own groups
      const admin2Groups = await groupService.listGroups(admin2.telegram_user_id);
      assert.strictEqual(admin2Groups.length, 1);
      assert.strictEqual(admin2Groups[0].telegram_group_id, "-1002222222221");
    });
  });
});
