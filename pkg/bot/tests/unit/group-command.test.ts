import assert from "node:assert";
import {afterEach, beforeEach, describe, it, mock} from "node:test";

import {commandRegistry} from "../../adapters/telegram/command-registry";
import {createGroupCommands} from "../../adapters/telegram/commands/group";
import {formatErrorResponse, formatResponse} from "../../adapters/telegram/response-formatter";
import type {ErrorResponseConfig, ResponseConfig} from "../../adapters/telegram/types";
import {ConflictError, NotFoundError} from "../../errors";
import type {Dependencies} from "../../services/base";

// Mock dependencies for createGroupCommands
function createMockDeps(): Dependencies {
  return {
    connection: {type: "memory"},
    logger: {
      debug: mock.fn(),
      info: mock.fn(),
      warn: mock.fn(),
      error: mock.fn(),
      fatal: mock.fn(),
      trace: mock.fn(),
      child: mock.fn(),
      level: "info",
      silent: mock.fn(),
    } as unknown as Dependencies["logger"],
    repos: {} as Dependencies["repos"],
  };
}

describe("Group Commands", () => {
  beforeEach(() => {
    commandRegistry.clear();
  });

  afterEach(() => {
    commandRegistry.clear();
  });

  describe("createGroupCommands", () => {
    /**
     * Task 4.1: Unit tests for command definition structure
     */
    describe("command definition structure", () => {
      it("should create a command definition with correct pattern", () => {
        const deps = createMockDeps();
        const commands = createGroupCommands(deps);

        assert.strictEqual(commands.length, 1);
        const connectGroupCmd = commands[0];

        assert.ok(connectGroupCmd.pattern.test("/connect_group"));
        assert.ok(!connectGroupCmd.pattern.test("/connect_group extra"));
        assert.ok(!connectGroupCmd.pattern.test("/connect_groups"));
        assert.ok(!connectGroupCmd.pattern.test("connect_group"));
      });

      it("should have group chat filter", () => {
        const deps = createMockDeps();
        const commands = createGroupCommands(deps);
        const connectGroupCmd = commands[0];

        assert.strictEqual(connectGroupCmd.chatFilter, "group");
      });

      it("should have error mappings configured for NotFoundError and ConflictError", () => {
        const deps = createMockDeps();
        const commands = createGroupCommands(deps);
        const connectGroupCmd = commands[0];

        assert.ok(connectGroupCmd.errorResponse);
        assert.ok(connectGroupCmd.errorResponse.mappings.length >= 2);

        const notFoundMapping = connectGroupCmd.errorResponse.mappings.find(
          (m) => m.errorType === "NotFoundError",
        );
        const conflictMapping = connectGroupCmd.errorResponse.mappings.find(
          (m) => m.errorType === "ConflictError",
        );

        assert.ok(notFoundMapping, "Should have NotFoundError mapping");
        assert.ok(conflictMapping, "Should have ConflictError mapping");
      });

      it("should have default error template configured", () => {
        const deps = createMockDeps();
        const commands = createGroupCommands(deps);
        const connectGroupCmd = commands[0];

        assert.ok(connectGroupCmd.errorResponse);
        assert.ok(connectGroupCmd.errorResponse.defaultTemplate);
        assert.ok(connectGroupCmd.errorResponse.defaultTemplate.includes("{{message}}"));
      });

      it("should register command metadata with CommandRegistry", () => {
        // Create commands (this registers metadata with the singleton)
        const deps = createMockDeps();
        createGroupCommands(deps);

        // Check the singleton registry (used by createGroupCommands)
        const allCommands = commandRegistry.getAll();

        const connectGroupMeta = allCommands.find(
          (c: {command: string}) => c.command === "/connect_group",
        );

        assert.ok(connectGroupMeta, "Should register /connect_group metadata");
        assert.strictEqual(connectGroupMeta.description, "Connect this group to the bot");
        assert.strictEqual(connectGroupMeta.category, "Group Commands");
        assert.ok(
          !connectGroupMeta.privateOnly,
          "Should NOT be marked as privateOnly since it works in groups",
        );
      });
    });

    /**
     * Task 4.2: Unit tests for chat filter behavior
     */
    describe("chat filter behavior", () => {
      it("should reject private chats with group filter", () => {
        const deps = createMockDeps();
        const commands = createGroupCommands(deps);
        const connectGroupCmd = commands[0];

        // The chatFilter is "group", which means private chats should be rejected
        assert.strictEqual(connectGroupCmd.chatFilter, "group");
      });

      it("should accept group chats with group filter", () => {
        const deps = createMockDeps();
        const commands = createGroupCommands(deps);
        const connectGroupCmd = commands[0];

        // chatFilter "group" accepts both "group" and "supergroup" chat types
        assert.strictEqual(connectGroupCmd.chatFilter, "group");
      });
    });

    /**
     * Task 4.3: Unit tests for response formatting
     */
    describe("response formatting", () => {
      it("should include group name in success response", () => {
        const deps = createMockDeps();
        const commands = createGroupCommands(deps);
        const connectGroupCmd = commands[0];

        const result = {group_name: "Test Gaming Group"};
        const formatted = formatResponse(
          connectGroupCmd.response as ResponseConfig<typeof result>,
          result,
        );

        assert.ok(formatted !== null);
        assert.ok(formatted.includes("Test Gaming Group"));
      });

      it("should format NotFoundError with register instructions", () => {
        const deps = createMockDeps();
        const commands = createGroupCommands(deps);
        const connectGroupCmd = commands[0];

        const error = new NotFoundError("Admin not found");
        const formatted = formatErrorResponse(
          connectGroupCmd.errorResponse as ErrorResponseConfig,
          error,
        );

        assert.ok(formatted.includes("/register"));
        assert.ok(formatted.includes("private chat"));
      });

      it("should format ConflictError with already connected message", () => {
        const deps = createMockDeps();
        const commands = createGroupCommands(deps);
        const connectGroupCmd = commands[0];

        const error = new ConflictError("Group already exists");
        const formatted = formatErrorResponse(
          connectGroupCmd.errorResponse as ErrorResponseConfig,
          error,
        );

        assert.ok(formatted.includes("already connected"));
      });

      it("should use default template for unmapped errors", () => {
        const deps = createMockDeps();
        const commands = createGroupCommands(deps);
        const connectGroupCmd = commands[0];

        const error = new Error("Something unexpected happened");
        const formatted = formatErrorResponse(
          connectGroupCmd.errorResponse as ErrorResponseConfig,
          error,
        );

        assert.ok(formatted.includes("Something unexpected happened"));
        assert.ok(formatted.includes("Failed to connect"));
      });
    });
  });
});
