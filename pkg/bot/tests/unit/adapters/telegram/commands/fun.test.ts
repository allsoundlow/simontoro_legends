import assert from "node:assert";
import {afterEach, beforeEach, describe, it, mock} from "node:test";

import {commandRegistry} from "../../../../../adapters/telegram/command-registry";
import {createFunCommands} from "../../../../../adapters/telegram/commands/fun";
import {formatErrorResponse, formatResponse} from "../../../../../adapters/telegram/response-formatter";
import type {ErrorResponseConfig, ResponseConfig} from "../../../../../adapters/telegram/types";
import {NotFoundError, RateLimitError, ValidationError} from "../../../../../errors";
import type {AiDependencies} from "../../../../../services/ai";

// Type for roast command input
type RoastInput = {
  targetUsername: string;
  level: "soft" | "hard" | "extra";
  context?: string;
  groupId: string;
  requesterId: string;
};

// Mock dependencies for createFunCommands
function createMockDeps(): AiDependencies {
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
    } as unknown as AiDependencies["logger"],
    repos: {} as AiDependencies["repos"],
    openRouterClient: {
      generateCompletion: mock.fn(),
    } as unknown as AiDependencies["openRouterClient"],
    rateLimiter: {
      checkLimit: mock.fn(),
      cleanup: mock.fn(),
    } as unknown as AiDependencies["rateLimiter"],
  };
}

// Helper to create mock grammY context
function createMockContext(text: string, chatId = -123456, fromId = 789) {
  return {
    message: {text},
    chat: {id: chatId, type: "group"},
    from: {id: fromId},
  };
}

describe("Fun Commands", () => {
  beforeEach(() => {
    commandRegistry.clear();
  });

  afterEach(() => {
    commandRegistry.clear();
  });

  describe("createFunCommands", () => {
    describe("command definition structure", () => {
      it("should create a command definition with correct pattern", () => {
        const deps = createMockDeps();
        const commands = createFunCommands(deps);

        assert.strictEqual(commands.length, 1);
        const roastCmd = commands[0];

        assert.ok(roastCmd.pattern.test("/roast @username"));
        assert.ok(roastCmd.pattern.test("/roast @user soft"));
        assert.ok(roastCmd.pattern.test("/roast @user hard context here"));
        assert.ok(!roastCmd.pattern.test("/roaster @user"));
      });

      it("should have group chat filter", () => {
        const deps = createMockDeps();
        const commands = createFunCommands(deps);
        const roastCmd = commands[0];

        assert.strictEqual(roastCmd.chatFilter, "group");
      });

      it("should register command metadata with CommandRegistry", () => {
        const deps = createMockDeps();
        createFunCommands(deps);

        const allCommands = commandRegistry.getAll();
        const roastMeta = allCommands.find((c: {command: string}) => c.command === "/roast");

        assert.ok(roastMeta, "Should register /roast metadata");
        assert.strictEqual(roastMeta.description, "Generate a playful AI roast of a user");
        assert.strictEqual(roastMeta.category, "Fun Commands");
        assert.ok(roastMeta.usage?.includes("@username"));
      });

      it("should have error mappings for NotFoundError, ValidationError, and RateLimitError", () => {
        const deps = createMockDeps();
        const commands = createFunCommands(deps);
        const roastCmd = commands[0];

        assert.ok(roastCmd.errorResponse);
        assert.ok(roastCmd.errorResponse.mappings.length >= 3);

        const notFoundMapping = roastCmd.errorResponse.mappings.find(
          (m) => m.errorType === "NotFoundError",
        );
        const validationMapping = roastCmd.errorResponse.mappings.find(
          (m) => m.errorType === "ValidationError",
        );
        const rateLimitMapping = roastCmd.errorResponse.mappings.find(
          (m) => m.errorType === "RateLimitError",
        );

        assert.ok(notFoundMapping, "Should have NotFoundError mapping");
        assert.ok(validationMapping, "Should have ValidationError mapping");
        assert.ok(rateLimitMapping, "Should have RateLimitError mapping");
      });
    });

    describe("parseInput - valid command formats", () => {
      it("should parse /roast @username with default level hard", () => {
        const deps = createMockDeps();
        const commands = createFunCommands(deps);
        const roastCmd = commands[0];

        const ctx = createMockContext("/roast @testuser");
        const input = roastCmd.parseInput(ctx as never) as RoastInput;

        assert.strictEqual(input.targetUsername, "testuser");
        assert.strictEqual(input.level, "hard");
        assert.strictEqual(input.context, undefined);
      });

      it("should parse /roast @username soft", () => {
        const deps = createMockDeps();
        const commands = createFunCommands(deps);
        const roastCmd = commands[0];

        const ctx = createMockContext("/roast @testuser soft");
        const input = roastCmd.parseInput(ctx as never) as RoastInput;

        assert.strictEqual(input.targetUsername, "testuser");
        assert.strictEqual(input.level, "soft");
      });

      it("should parse /roast @username hard", () => {
        const deps = createMockDeps();
        const commands = createFunCommands(deps);
        const roastCmd = commands[0];

        const ctx = createMockContext("/roast @testuser hard");
        const input = roastCmd.parseInput(ctx as never) as RoastInput;

        assert.strictEqual(input.targetUsername, "testuser");
        assert.strictEqual(input.level, "hard");
      });

      it("should parse /roast @username extra", () => {
        const deps = createMockDeps();
        const commands = createFunCommands(deps);
        const roastCmd = commands[0];

        const ctx = createMockContext("/roast @testuser extra");
        const input = roastCmd.parseInput(ctx as never) as RoastInput;

        assert.strictEqual(input.targetUsername, "testuser");
        assert.strictEqual(input.level, "extra");
      });

      it("should parse /roast @username hard some context here", () => {
        const deps = createMockDeps();
        const commands = createFunCommands(deps);
        const roastCmd = commands[0];

        const ctx = createMockContext("/roast @testuser hard loves playing Dota 2");
        const input = roastCmd.parseInput(ctx as never) as RoastInput;

        assert.strictEqual(input.targetUsername, "testuser");
        assert.strictEqual(input.level, "hard");
        assert.strictEqual(input.context, "loves playing Dota 2");
      });

      it("should parse /roast @username context without level (default to hard)", () => {
        const deps = createMockDeps();
        const commands = createFunCommands(deps);
        const roastCmd = commands[0];

        const ctx = createMockContext("/roast @testuser always loses at chess");
        const input = roastCmd.parseInput(ctx as never) as RoastInput;

        assert.strictEqual(input.targetUsername, "testuser");
        assert.strictEqual(input.level, "hard");
        assert.strictEqual(input.context, "always loses at chess");
      });

      it("should extract groupId and requesterId from context", () => {
        const deps = createMockDeps();
        const commands = createFunCommands(deps);
        const roastCmd = commands[0];

        const ctx = createMockContext("/roast @testuser", -999888, 12345);
        const input = roastCmd.parseInput(ctx as never) as RoastInput;

        assert.strictEqual(input.groupId, "-999888");
        assert.strictEqual(input.requesterId, "12345");
      });
    });

    describe("parseInput - case-insensitive level keywords", () => {
      it("should parse SOFT as soft", () => {
        const deps = createMockDeps();
        const commands = createFunCommands(deps);
        const roastCmd = commands[0];

        const ctx = createMockContext("/roast @testuser SOFT");
        const input = roastCmd.parseInput(ctx as never) as RoastInput;

        assert.strictEqual(input.level, "soft");
      });

      it("should parse Soft as soft", () => {
        const deps = createMockDeps();
        const commands = createFunCommands(deps);
        const roastCmd = commands[0];

        const ctx = createMockContext("/roast @testuser Soft");
        const input = roastCmd.parseInput(ctx as never) as RoastInput;

        assert.strictEqual(input.level, "soft");
      });

      it("should parse HARD as hard", () => {
        const deps = createMockDeps();
        const commands = createFunCommands(deps);
        const roastCmd = commands[0];

        const ctx = createMockContext("/roast @testuser HARD");
        const input = roastCmd.parseInput(ctx as never) as RoastInput;

        assert.strictEqual(input.level, "hard");
      });

      it("should parse EXTRA as extra", () => {
        const deps = createMockDeps();
        const commands = createFunCommands(deps);
        const roastCmd = commands[0];

        const ctx = createMockContext("/roast @testuser EXTRA");
        const input = roastCmd.parseInput(ctx as never) as RoastInput;

        assert.strictEqual(input.level, "extra");
      });
    });

    describe("parseInput - invalid commands", () => {
      it("should throw error when username is missing", () => {
        const deps = createMockDeps();
        const commands = createFunCommands(deps);
        const roastCmd = commands[0];

        const ctx = createMockContext("/roast");

        assert.throws(
          () => roastCmd.parseInput(ctx as never),
          {message: /Usage:.*@username/},
        );
      });

      it("should throw error when context exceeds 500 characters", () => {
        const deps = createMockDeps();
        const commands = createFunCommands(deps);
        const roastCmd = commands[0];

        const longContext = "a".repeat(501);
        const ctx = createMockContext(`/roast @testuser hard ${longContext}`);

        assert.throws(
          () => roastCmd.parseInput(ctx as never),
          {message: /Context too long.*500/},
        );
      });

      it("should accept context at exactly 500 characters", () => {
        const deps = createMockDeps();
        const commands = createFunCommands(deps);
        const roastCmd = commands[0];

        const exactContext = "a".repeat(500);
        const ctx = createMockContext(`/roast @testuser hard ${exactContext}`);

        const input = roastCmd.parseInput(ctx as never) as RoastInput;
        assert.strictEqual(input.context?.length, 500);
      });
    });

    describe("response formatting", () => {
      it("should format roast response with template", () => {
        const deps = createMockDeps();
        const commands = createFunCommands(deps);
        const roastCmd = commands[0];

        const result = {roast: "You call that gaming? My grandma has better reflexes!"};
        const formatted = formatResponse(
          roastCmd.response as ResponseConfig<typeof result>,
          result,
        );

        assert.strictEqual(formatted, "You call that gaming? My grandma has better reflexes!");
      });

      it("should format NotFoundError with connect_group instructions", () => {
        const deps = createMockDeps();
        const commands = createFunCommands(deps);
        const roastCmd = commands[0];

        const error = new NotFoundError("Group not registered");
        const formatted = formatErrorResponse(
          roastCmd.errorResponse as ErrorResponseConfig,
          error,
        );

        assert.ok(formatted.includes("not connected"));
        assert.ok(formatted.includes("/connect_group"));
      });

      it("should format ValidationError with error message", () => {
        const deps = createMockDeps();
        const commands = createFunCommands(deps);
        const roastCmd = commands[0];

        const error = new ValidationError("This group is not active");
        const formatted = formatErrorResponse(
          roastCmd.errorResponse as ErrorResponseConfig,
          error,
        );

        assert.ok(formatted.includes("This group is not active"));
      });

      it("should format RateLimitError with retry timing", () => {
        const deps = createMockDeps();
        const commands = createFunCommands(deps);
        const roastCmd = commands[0];

        // RateLimitError has retryAfter property but template uses {{retryAfter}}
        // The error message is what gets interpolated via {{message}}
        const error = new RateLimitError("Rate limit exceeded", 30);
        const formatted = formatErrorResponse(
          roastCmd.errorResponse as ErrorResponseConfig,
          error,
        );

        assert.ok(formatted.includes("Too many roasts"));
      });

      it("should use default template for unmapped errors", () => {
        const deps = createMockDeps();
        const commands = createFunCommands(deps);
        const roastCmd = commands[0];

        const error = new Error("Something unexpected happened");
        const formatted = formatErrorResponse(
          roastCmd.errorResponse as ErrorResponseConfig,
          error,
        );

        assert.ok(formatted.includes("Failed to generate roast"));
        assert.ok(formatted.includes("Something unexpected happened"));
      });
    });
  });
});
