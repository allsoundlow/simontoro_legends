import assert from "node:assert";
import {after, before, describe, it} from "node:test";

import {CommandRegistry} from "../../adapters/telegram/command-registry";
import type {CommandMetadata} from "../../adapters/telegram/types";

describe("CommandRegistry", () => {
  let registry: CommandRegistry;

  before(() => {
    registry = new CommandRegistry();
  });

  after(() => {
    registry.clear();
  });

  describe("register", () => {
    it("should add a command to the registry", () => {
      const metadata: CommandMetadata = {
        command: "/test",
        description: "Test command",
        category: "Test",
      };

      registry.register(metadata);
      const all = registry.getAll();

      assert.strictEqual(all.length, 1);
      assert.strictEqual(all[0].command, "/test");
    });

    it("should validate command format", () => {
      assert.throws(
        () =>
          registry.register({
            command: "invalid", // Missing leading slash
            description: "Test",
            category: "Test",
          }),
        /Invalid/,
      );
    });
  });

  describe("registerMany", () => {
    before(() => {
      registry.clear();
    });

    it("should add multiple commands at once", () => {
      const metadata: CommandMetadata[] = [
        {command: "/cmd1", description: "Command 1", category: "Cat1"},
        {command: "/cmd2", description: "Command 2", category: "Cat2"},
      ];

      registry.registerMany(metadata);
      const all = registry.getAll();

      assert.strictEqual(all.length, 2);
    });
  });

  describe("getAll", () => {
    before(() => {
      registry.clear();
      registry.registerMany([
        {command: "/a", description: "A", category: "Cat"},
        {command: "/b", description: "B", category: "Cat"},
      ]);
    });

    it("should return all registered commands", () => {
      const all = registry.getAll();
      assert.strictEqual(all.length, 2);
    });

    it("should return a copy, not the internal array", () => {
      const all = registry.getAll();
      all.push({command: "/fake", description: "Fake", category: "Fake"});

      assert.strictEqual(registry.getAll().length, 2);
    });
  });

  describe("getByCategory", () => {
    before(() => {
      registry.clear();
      registry.registerMany([
        {command: "/help", description: "Help", category: "General"},
        {command: "/register", description: "Register", category: "Admin Commands"},
        {command: "/status", description: "Status", category: "Admin Commands"},
        {command: "/groups", description: "Groups", category: "Group Commands"},
        {command: "/custom", description: "Custom", category: "Zebra Category"},
      ]);
    });

    it("should group commands by category", () => {
      const grouped = registry.getByCategory();

      assert.strictEqual(grouped.get("General")?.length, 1);
      assert.strictEqual(grouped.get("Admin Commands")?.length, 2);
      assert.strictEqual(grouped.get("Group Commands")?.length, 1);
    });

    it("should order categories by predefined order", () => {
      const grouped = registry.getByCategory();
      const categories = Array.from(grouped.keys());

      // General should come before Admin Commands
      assert.ok(categories.indexOf("General") < categories.indexOf("Admin Commands"));
      // Admin Commands should come before Group Commands
      assert.ok(categories.indexOf("Admin Commands") < categories.indexOf("Group Commands"));
    });

    it("should append unknown categories alphabetically at the end", () => {
      const grouped = registry.getByCategory();
      const categories = Array.from(grouped.keys());

      // Zebra Category should be last (not in predefined order)
      assert.strictEqual(categories[categories.length - 1], "Zebra Category");
    });
  });

  describe("clear", () => {
    it("should remove all commands", () => {
      registry.clear();
      registry.register({command: "/test", description: "Test", category: "Test"});

      assert.strictEqual(registry.getAll().length, 1);

      registry.clear();

      assert.strictEqual(registry.getAll().length, 0);
    });
  });
});
