import assert from "node:assert";
import {beforeEach, describe, it} from "node:test";

import type {Admin} from "../../entities";
import {ConflictError, NotFoundError} from "../../errors";
import {createRepositories, Repositories} from "../../repositories";
import * as GroupUseCases from "../../services/group";
import type {Dependencies} from "../../services/base";
import {createConnection, type Connection} from "../../storage";

const mockLogger = {
  info: () => {},
  debug: () => {},
  warn: () => {},
  error: () => {},
  trace: () => {},
  fatal: () => {},
  child: () => mockLogger,
  level: "info",
  silent: () => {},
} as unknown as Dependencies["logger"];

describe("Group Use Cases", () => {
  let connection: Connection;
  let repos: Repositories;
  let deps: Dependencies;

  beforeEach(() => {
    connection = createConnection({});
    repos = createRepositories(connection);
    deps = {connection, logger: mockLogger, repos};
  });

  async function createAdmin(telegramUserId: string): Promise<Admin> {
    return repos.admin.create({telegram_user_id: telegramUserId, telegram_username: null});
  }

  describe("Register", () => {
    it("should create group with correct admin", async () => {
      const admin = await createAdmin("123");

      const group = await new GroupUseCases.Register(deps).run({
        adminTelegramId: "123",
        telegramGroupId: "-100123",
        groupName: "Test Group",
      });

      assert.strictEqual(group.admin_pk, admin.pk);
      assert.strictEqual(group.status, "active");
    });

    it("should throw NotFoundError for non-registered admin", async () => {
      await assert.rejects(
        () =>
          new GroupUseCases.Register(deps).run({
            adminTelegramId: "nonexistent",
            telegramGroupId: "-100123",
            groupName: "Test",
          }),
        NotFoundError,
      );
    });

    it("should throw ConflictError for duplicate group", async () => {
      await createAdmin("123");
      const useCase = new GroupUseCases.Register(deps);
      await useCase.run({adminTelegramId: "123", telegramGroupId: "-100123", groupName: "Test"});

      await assert.rejects(
        () => useCase.run({adminTelegramId: "123", telegramGroupId: "-100123", groupName: "Test"}),
        ConflictError,
      );
    });

    it("should reactivate inactive group", async () => {
      await createAdmin("123");
      const useCase = new GroupUseCases.Register(deps);
      const original = await useCase.run({
        adminTelegramId: "123",
        telegramGroupId: "-100123",
        groupName: "Test",
      });
      await repos.group.update(original.pk, {status: "inactive"});

      const reactivated = await useCase.run({
        adminTelegramId: "123",
        telegramGroupId: "-100123",
        groupName: "Test",
      });

      assert.strictEqual(reactivated.pk, original.pk);
      assert.strictEqual(reactivated.status, "active");
    });
  });

  describe("List", () => {
    it("should return admin's groups", async () => {
      await createAdmin("123");
      const registerUseCase = new GroupUseCases.Register(deps);
      await registerUseCase.run({adminTelegramId: "123", telegramGroupId: "-1001", groupName: "G1"});
      await registerUseCase.run({adminTelegramId: "123", telegramGroupId: "-1002", groupName: "G2"});

      const groups = await new GroupUseCases.List(deps).run({adminTelegramId: "123"});

      assert.strictEqual(groups.length, 2);
    });

    it("should throw NotFoundError for non-registered admin", async () => {
      await assert.rejects(
        () => new GroupUseCases.List(deps).run({adminTelegramId: "nonexistent"}),
        NotFoundError,
      );
    });
  });

  describe("Unregister", () => {
    it("should mark group as inactive", async () => {
      await createAdmin("123");
      const group = await new GroupUseCases.Register(deps).run({
        adminTelegramId: "123",
        telegramGroupId: "-100123",
        groupName: "Test",
      });

      await new GroupUseCases.Unregister(deps).run({
        adminTelegramId: "123",
        telegramGroupId: "-100123",
      });

      assert.strictEqual((await repos.group.findById(group.pk))?.status, "inactive");
    });

    it("should throw NotFoundError for another admin's group", async () => {
      await createAdmin("admin1");
      await createAdmin("admin2");
      await new GroupUseCases.Register(deps).run({
        adminTelegramId: "admin1",
        telegramGroupId: "-100123",
        groupName: "Test",
      });

      await assert.rejects(
        () =>
          new GroupUseCases.Unregister(deps).run({
            adminTelegramId: "admin2",
            telegramGroupId: "-100123",
          }),
        NotFoundError,
      );
    });
  });

  describe("MarkBotRemoved", () => {
    it("should mark group as bot_removed", async () => {
      await createAdmin("123");
      const group = await new GroupUseCases.Register(deps).run({
        adminTelegramId: "123",
        telegramGroupId: "-100123",
        groupName: "Test",
      });

      await new GroupUseCases.MarkBotRemoved(deps).run({telegramGroupId: "-100123"});

      assert.strictEqual((await repos.group.findById(group.pk))?.status, "bot_removed");
    });

    it("should not throw for non-existent group", async () => {
      await new GroupUseCases.MarkBotRemoved(deps).run({telegramGroupId: "-999"});
    });
  });

  describe("IsAdmin", () => {
    it("should return true when admin owns the group", async () => {
      await createAdmin("123");
      await new GroupUseCases.Register(deps).run({
        adminTelegramId: "123",
        telegramGroupId: "-100123",
        groupName: "Test",
      });

      const result = await new GroupUseCases.IsAdmin(deps).run({
        adminTelegramId: "123",
        telegramGroupId: "-100123",
      });

      assert.strictEqual(result, true);
    });

    it("should return false when admin does not own the group", async () => {
      await createAdmin("admin1");
      await createAdmin("admin2");
      await new GroupUseCases.Register(deps).run({
        adminTelegramId: "admin1",
        telegramGroupId: "-100123",
        groupName: "Test",
      });

      const result = await new GroupUseCases.IsAdmin(deps).run({
        adminTelegramId: "admin2",
        telegramGroupId: "-100123",
      });

      assert.strictEqual(result, false);
    });
  });

  describe("Group isolation", () => {
    it("should only list own groups", async () => {
      await createAdmin("admin1");
      await createAdmin("admin2");
      const registerUseCase = new GroupUseCases.Register(deps);
      await registerUseCase.run({adminTelegramId: "admin1", telegramGroupId: "-1001", groupName: "A1"});
      await registerUseCase.run({adminTelegramId: "admin2", telegramGroupId: "-1002", groupName: "A2"});

      const admin1Groups = await new GroupUseCases.List(deps).run({adminTelegramId: "admin1"});
      const admin2Groups = await new GroupUseCases.List(deps).run({adminTelegramId: "admin2"});

      assert.strictEqual(admin1Groups.length, 1);
      assert.strictEqual(admin2Groups.length, 1);
      assert.strictEqual(admin1Groups[0].telegram_group_id, "-1001");
      assert.strictEqual(admin2Groups[0].telegram_group_id, "-1002");
    });
  });
});
