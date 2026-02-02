import assert from "node:assert";
import {after, before, describe, it} from "node:test";

import {CommandRegistry} from "../../adapters/telegram/command-registry";
import {createHelpCommand} from "../../adapters/telegram/commands/help";

type HelpResult = {message: string};

describe("Help Command", () => {
  let registry: CommandRegistry;

  before(() => {
    registry = new CommandRegistry();
  });

  after(() => {
    registry.clear();
  });

  describe("createHelpCommand", () => {
    it("should create a command definition with correct pattern", () => {
      const helpCommand = createHelpCommand(registry);

      assert.ok(helpCommand.pattern.test("/help"));
      assert.ok(!helpCommand.pattern.test("/help extra"));
      assert.ok(!helpCommand.pattern.test("/helper"));
    });

    it("should not have chat filter (works in all chats)", () => {
      const helpCommand = createHelpCommand(registry);

      assert.strictEqual(helpCommand.chatFilter, undefined);
    });

    it("should return empty message when no commands registered", async () => {
      registry.clear();
      const helpCommand = createHelpCommand(registry);

      const result = (await helpCommand.useCase.run({isGroupChat: false})) as HelpResult;

      assert.ok(result.message.includes("No commands are currently available"));
    });

    it("should include all registered commands in output for private chat", async () => {
      registry.clear();
      registry.registerMany([
        {command: "/help", description: "Show help", category: "General"},
        {command: "/register", description: "Register account", category: "Admin Commands", privateOnly: true},
      ]);

      const helpCommand = createHelpCommand(registry);
      const result = (await helpCommand.useCase.run({isGroupChat: false})) as HelpResult;

      assert.ok(result.message.includes("/help"));
      assert.ok(result.message.includes("/register"));
      assert.ok(result.message.includes("Show help"));
      assert.ok(result.message.includes("Register account"));
    });

    it("should filter out privateOnly commands in group chat", async () => {
      registry.clear();
      registry.registerMany([
        {command: "/help", description: "Show help", category: "General"},
        {command: "/register", description: "Register account", category: "Admin Commands", privateOnly: true},
        {command: "/connect_group", description: "Connect group", category: "Group Commands"},
      ]);

      const helpCommand = createHelpCommand(registry);
      const result = (await helpCommand.useCase.run({isGroupChat: true})) as HelpResult;

      assert.ok(result.message.includes("/help"));
      assert.ok(result.message.includes("/connect_group"));
      assert.ok(!result.message.includes("/register"));
    });

    it("should group commands by category", async () => {
      registry.clear();
      registry.registerMany([
        {command: "/help", description: "Show help", category: "General"},
        {command: "/connect_group", description: "Connect", category: "Group Commands"},
      ]);

      const helpCommand = createHelpCommand(registry);
      const result = (await helpCommand.useCase.run({isGroupChat: false})) as HelpResult;

      assert.ok(result.message.includes("*General*"));
      assert.ok(result.message.includes("*Group Commands*"));
    });

    it("should include usage examples when provided", async () => {
      registry.clear();
      registry.register({
        command: "/keyword",
        description: "Manage keywords",
        usage: "/keyword add <pattern>",
        category: "Keyword Commands",
      });

      const helpCommand = createHelpCommand(registry);
      const result = (await helpCommand.useCase.run({isGroupChat: false})) as HelpResult;

      assert.ok(result.message.includes("/keyword add <pattern>"));
    });

    it("should format command names in monospace", async () => {
      registry.clear();
      registry.register({
        command: "/test",
        description: "Test command",
        category: "Test",
      });

      const helpCommand = createHelpCommand(registry);
      const result = (await helpCommand.useCase.run({isGroupChat: false})) as HelpResult;

      assert.ok(result.message.includes("`/test`"));
    });

    it("should include welcome header in private chat", async () => {
      registry.clear();
      registry.register({
        command: "/test",
        description: "Test",
        category: "Test",
      });

      const helpCommand = createHelpCommand(registry);
      const result = (await helpCommand.useCase.run({isGroupChat: false})) as HelpResult;

      assert.ok(result.message.includes("Saimontoro Help"));
      assert.ok(result.message.includes("Welcome"));
    });

    it("should show group-specific header in group chat", async () => {
      registry.clear();
      registry.register({
        command: "/connect_group",
        description: "Connect group",
        category: "Group Commands",
      });

      const helpCommand = createHelpCommand(registry);
      const result = (await helpCommand.useCase.run({isGroupChat: true})) as HelpResult;

      assert.ok(result.message.includes("Saimontoro Help"));
      assert.ok(result.message.includes("Available commands in this group"));
    });
  });
});
