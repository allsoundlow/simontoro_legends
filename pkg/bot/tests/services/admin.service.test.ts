import assert from "node:assert";
import {beforeEach, describe, it} from "node:test";

import {ConflictError, NotFoundError} from "../../errors";
import {createRepositories, Repositories} from "../../repositories";
import * as AdminUseCases from "../../services/admin";
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

describe("Admin Use Cases", () => {
  let connection: Connection;
  let repos: Repositories;
  let deps: Dependencies;

  beforeEach(() => {
    connection = createConnection({});
    repos = createRepositories(connection);
    deps = {connection, logger: mockLogger, repos};
  });

  describe("Register", () => {
    it("should create a new admin", async () => {
      const admin = await new AdminUseCases.Register(deps).run({
        telegramUserId: "123456789",
        telegramUsername: "testuser",
      });

      assert.strictEqual(admin.telegram_user_id, "123456789");
      assert.strictEqual(admin.status, "active");
    });

    it("should throw ConflictError for duplicate registration", async () => {
      const useCase = new AdminUseCases.Register(deps);
      await useCase.run({telegramUserId: "123", telegramUsername: "user"});

      await assert.rejects(
        () => useCase.run({telegramUserId: "123", telegramUsername: "user"}),
        ConflictError,
      );
    });

    it("should reactivate inactive admin", async () => {
      const useCase = new AdminUseCases.Register(deps);
      const original = await useCase.run({telegramUserId: "123", telegramUsername: "user"});
      await repos.admin.update(original.pk, {status: "inactive"});

      const reactivated = await useCase.run({telegramUserId: "123", telegramUsername: "user"});

      assert.strictEqual(reactivated.pk, original.pk);
      assert.strictEqual(reactivated.status, "active");
    });
  });

  describe("GetByTelegramId", () => {
    it("should return admin when found", async () => {
      await new AdminUseCases.Register(deps).run({telegramUserId: "123", telegramUsername: "user"});

      const found = await new AdminUseCases.GetByTelegramId(deps).run({telegramUserId: "123"});

      assert.strictEqual(found.telegram_user_id, "123");
    });

    it("should throw NotFoundError for non-existent admin", async () => {
      await assert.rejects(
        () => new AdminUseCases.GetByTelegramId(deps).run({telegramUserId: "nonexistent"}),
        NotFoundError,
      );
    });

    it("should throw NotFoundError for inactive admin", async () => {
      const admin = await new AdminUseCases.Register(deps).run({
        telegramUserId: "123",
        telegramUsername: "user",
      });
      await repos.admin.update(admin.pk, {status: "inactive"});

      await assert.rejects(
        () => new AdminUseCases.GetByTelegramId(deps).run({telegramUserId: "123"}),
        NotFoundError,
      );
    });
  });

  describe("GetStatus", () => {
    it("should return admin with group count", async () => {
      const admin = await new AdminUseCases.Register(deps).run({
        telegramUserId: "123",
        telegramUsername: "user",
      });
      await repos.group.create({telegram_group_id: "g1", group_name: "Group 1", admin_pk: admin.pk});
      await repos.group.create({telegram_group_id: "g2", group_name: "Group 2", admin_pk: admin.pk});

      const status = await new AdminUseCases.GetStatus(deps).run({telegramUserId: "123"});

      assert.strictEqual(status.groupCount, 2);
    });

    it("should throw NotFoundError for non-registered user", async () => {
      await assert.rejects(
        () => new AdminUseCases.GetStatus(deps).run({telegramUserId: "nonexistent"}),
        NotFoundError,
      );
    });
  });

  describe("DeleteAccount", () => {
    it("should delete admin and mark groups inactive", async () => {
      const admin = await new AdminUseCases.Register(deps).run({
        telegramUserId: "123",
        telegramUsername: "user",
      });
      const group = await repos.group.create({
        telegram_group_id: "g1",
        group_name: "Group",
        admin_pk: admin.pk,
      });

      await new AdminUseCases.DeleteAccount(deps).run({telegramUserId: "123"});

      assert.strictEqual(await repos.admin.findByTelegramId("123"), null);
      assert.strictEqual((await repos.group.findById(group.pk))?.status, "inactive");
    });

    it("should throw NotFoundError for non-registered user", async () => {
      await assert.rejects(
        () => new AdminUseCases.DeleteAccount(deps).run({telegramUserId: "nonexistent"}),
        NotFoundError,
      );
    });
  });

  describe("UpdateUsername", () => {
    it("should update username", async () => {
      await new AdminUseCases.Register(deps).run({telegramUserId: "123", telegramUsername: "old"});

      await new AdminUseCases.UpdateUsername(deps).run({telegramUserId: "123", newUsername: "new"});

      const admin = await repos.admin.findByTelegramId("123");
      assert.strictEqual(admin?.telegram_username, "new");
    });

    it("should not throw for non-existent admin", async () => {
      // Should silently do nothing
      await new AdminUseCases.UpdateUsername(deps).run({
        telegramUserId: "nonexistent",
        newUsername: "new",
      });
    });
  });
});
