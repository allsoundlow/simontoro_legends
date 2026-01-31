import assert from "node:assert";
import {describe, it, Mock,mock} from "node:test";

import type {Bot, Context} from "grammy";

import {TelegramRouter} from "../../adapters/telegram/router";
import type {CommandDefinition} from "../../adapters/telegram/types";

type MockFn = Mock<(...args: unknown[]) => unknown>;

// Mock logger
function createMockLogger() {
  return {
    debug: mock.fn(),
    info: mock.fn(),
    warn: mock.fn(),
    error: mock.fn(),
    fatal: mock.fn(),
    trace: mock.fn(),
    child: mock.fn(() => createMockLogger()),
    level: "info",
    silent: mock.fn(),
  } as unknown as ReturnType<typeof import("fastify")["default"]>["log"];
}

type MockBot = Bot & {
  _triggerMessage: (ctx: Context) => Promise<void>;
  on: MockFn;
  start: MockFn;
  stop: MockFn;
};

// Mock bot
function createMockBot(): MockBot {
  const handlers: Array<(ctx: Context) => Promise<void>> = [];
  return {
    on: mock.fn((event: string, handler: (ctx: Context) => Promise<void>) => {
      if (event === "message:text") {
        handlers.push(handler);
      }
    }),
    start: mock.fn(),
    stop: mock.fn(),
    // Helper to trigger message handlers for testing
    _triggerMessage: async (ctx: Context) => {
      for (const handler of handlers) {
        await handler(ctx);
      }
    },
  } as unknown as MockBot;
}

type MockContext = Context & {_replyMock: MockFn};

// Mock context
function createMockContext(text: string, userId = 123, username = "testuser"): MockContext {
  const replyMock = mock.fn();
  return {
    message: {text},
    from: {id: userId, username},
    reply: replyMock,
    _replyMock: replyMock,
  } as unknown as MockContext;
}

describe("TelegramRouter", () => {
  describe("constructor", () => {
    it("should accept bot and logger options", () => {
      const bot = createMockBot();
      const logger = createMockLogger();

      const router = new TelegramRouter({bot, logger});

      assert.ok(router);
    });
  });

  describe("register", () => {
    it("should return this for method chaining", () => {
      const bot = createMockBot();
      const logger = createMockLogger();
      const router = new TelegramRouter({bot, logger});

      const command: CommandDefinition<{id: string}, {name: string}> = {
        pattern: /^\/test$/,
        useCase: {run: async () => ({name: "test"})},
        parseInput: () => ({id: "1"}),
        response: {type: "text", template: "Hello {{name}}"},
      };

      const result = router.register(command);

      assert.strictEqual(result, router);
    });
  });

  describe("registerCommands", () => {
    it("should set up message handler on bot", () => {
      const bot = createMockBot();
      const logger = createMockLogger();
      const router = new TelegramRouter({bot, logger});

      router.registerCommands();

      assert.strictEqual(bot.on.mock.calls.length, 1);
      assert.strictEqual(bot.on.mock.calls[0].arguments[0], "message:text");
    });
  });

  describe("message handling", () => {
    it("should match command and execute use case", async () => {
      const bot = createMockBot();
      const logger = createMockLogger();
      const router = new TelegramRouter({bot, logger});

      const useCaseRun = mock.fn(async () => ({name: "Alice"}));
      const command: CommandDefinition<{id: string}, {name: string}> = {
        pattern: /^\/greet$/,
        useCase: {run: useCaseRun},
        parseInput: (ctx) => ({id: String(ctx.from?.id)}),
        response: {type: "text", template: "Hello, {{name}}!"},
      };

      router.register(command);
      router.registerCommands();

      const ctx = createMockContext("/greet");
      await bot._triggerMessage(ctx);

      assert.strictEqual(useCaseRun.mock.calls.length, 1);
      assert.strictEqual(ctx._replyMock.mock.calls.length, 1);
      assert.strictEqual(ctx._replyMock.mock.calls[0].arguments[0], "Hello, Alice!");
    });

    it("should not respond when no pattern matches", async () => {
      const bot = createMockBot();
      const logger = createMockLogger();
      const router = new TelegramRouter({bot, logger});

      const useCaseRun = mock.fn(async () => ({}));
      const command: CommandDefinition<{id: string}, Record<string, unknown>> = {
        pattern: /^\/specific$/,
        useCase: {run: useCaseRun},
        parseInput: () => ({id: "1"}),
        response: {type: "text", template: "Response"},
      };

      router.register(command);
      router.registerCommands();

      const ctx = createMockContext("/other");
      await bot._triggerMessage(ctx);

      assert.strictEqual(useCaseRun.mock.calls.length, 0);
      assert.strictEqual(ctx._replyMock.mock.calls.length, 0);
    });

    it("should use first matching pattern when multiple could match", async () => {
      const bot = createMockBot();
      const logger = createMockLogger();
      const router = new TelegramRouter({bot, logger});

      const firstRun = mock.fn(async () => ({result: "first"}));
      const secondRun = mock.fn(async () => ({result: "second"}));

      router.register({
        pattern: /^\/test/,
        useCase: {run: firstRun},
        parseInput: () => ({}),
        response: {type: "text", template: "First: {{result}}"},
      });

      router.register({
        pattern: /^\/test$/,
        useCase: {run: secondRun},
        parseInput: () => ({}),
        response: {type: "text", template: "Second: {{result}}"},
      });

      router.registerCommands();

      const ctx = createMockContext("/test");
      await bot._triggerMessage(ctx);

      assert.strictEqual(firstRun.mock.calls.length, 1);
      assert.strictEqual(secondRun.mock.calls.length, 0);
      assert.strictEqual(ctx._replyMock.mock.calls[0].arguments[0], "First: first");
    });

    it("should not send message for silent response", async () => {
      const bot = createMockBot();
      const logger = createMockLogger();
      const router = new TelegramRouter({bot, logger});

      router.register({
        pattern: /^\/silent$/,
        useCase: {run: async () => ({})},
        parseInput: () => ({}),
        response: {type: "silent"},
      });

      router.registerCommands();

      const ctx = createMockContext("/silent");
      await bot._triggerMessage(ctx);

      assert.strictEqual(ctx._replyMock.mock.calls.length, 0);
    });
  });

  describe("error handling", () => {
    it("should format error with mapped template", async () => {
      const bot = createMockBot();
      const logger = createMockLogger();
      const router = new TelegramRouter({bot, logger});

      class NotFoundError extends Error {
        constructor(message: string) {
          super(message);
          this.name = "NotFoundError";
        }
      }

      router.register({
        pattern: /^\/fail$/,
        useCase: {
          run: async () => {
            throw new NotFoundError("User not found");
          },
        },
        parseInput: () => ({}),
        response: {type: "text", template: "Success"},
        errorResponse: {
          mappings: [{errorType: "NotFoundError", template: "Not found!"}],
          defaultTemplate: "Error: {{message}}",
        },
      });

      router.registerCommands();

      const ctx = createMockContext("/fail");
      await bot._triggerMessage(ctx);

      assert.strictEqual(ctx._replyMock.mock.calls.length, 1);
      assert.strictEqual(ctx._replyMock.mock.calls[0].arguments[0], "Not found!");
    });

    it("should use default template for unmatched error", async () => {
      const bot = createMockBot();
      const logger = createMockLogger();
      const router = new TelegramRouter({bot, logger});

      router.register({
        pattern: /^\/fail$/,
        useCase: {
          run: async () => {
            throw new Error("Something broke");
          },
        },
        parseInput: () => ({}),
        response: {type: "text", template: "Success"},
        errorResponse: {
          mappings: [],
          defaultTemplate: "Oops: {{message}}",
        },
      });

      router.registerCommands();

      const ctx = createMockContext("/fail");
      await bot._triggerMessage(ctx);

      assert.strictEqual(ctx._replyMock.mock.calls[0].arguments[0], "Oops: Something broke");
    });

    it("should use generic error message when no errorResponse configured", async () => {
      const bot = createMockBot();
      const logger = createMockLogger();
      const router = new TelegramRouter({bot, logger});

      router.register({
        pattern: /^\/fail$/,
        useCase: {
          run: async () => {
            throw new Error("Internal error");
          },
        },
        parseInput: () => ({}),
        response: {type: "text", template: "Success"},
      });

      router.registerCommands();

      const ctx = createMockContext("/fail");
      await bot._triggerMessage(ctx);

      assert.strictEqual(
        ctx._replyMock.mock.calls[0].arguments[0],
        "Something went wrong. Please try again later.",
      );
    });

    it("should log error with context", async () => {
      const bot = createMockBot();
      const logger = createMockLogger();
      const router = new TelegramRouter({bot, logger});

      router.register({
        pattern: /^\/fail$/,
        useCase: {
          run: async () => {
            throw new Error("Test error");
          },
        },
        parseInput: () => ({}),
        response: {type: "text", template: "Success"},
      });

      router.registerCommands();

      const ctx = createMockContext("/fail", 456);
      await bot._triggerMessage(ctx);

      const errorLogger = logger.error as MockFn;
      assert.strictEqual(errorLogger.mock.calls.length, 1);
      const logContext = errorLogger.mock.calls[0].arguments[0] as Record<string, unknown>;
      assert.strictEqual(logContext.userId, 456);
      assert.strictEqual(logContext.pattern, "^\\/fail$");
      assert.strictEqual(logContext.errorType, "Error");
      assert.strictEqual(logContext.errorMessage, "Test error");
    });
  });

  describe("logging", () => {
    it("should log matched command at debug level", async () => {
      const bot = createMockBot();
      const logger = createMockLogger();
      const router = new TelegramRouter({bot, logger});

      router.register({
        pattern: /^\/test$/,
        useCase: {run: async () => ({})},
        parseInput: () => ({}),
        response: {type: "text", template: "OK"},
      });

      router.registerCommands();

      const ctx = createMockContext("/test", 789);
      await bot._triggerMessage(ctx);

      const debugLogger = logger.debug as MockFn;
      assert.strictEqual(debugLogger.mock.calls.length, 1);
      const logContext = debugLogger.mock.calls[0].arguments[0] as Record<string, unknown>;
      assert.strictEqual(logContext.userId, 789);
      assert.strictEqual(logContext.pattern, "^\\/test$");
    });

    it("should log successful execution at info level", async () => {
      const bot = createMockBot();
      const logger = createMockLogger();
      const router = new TelegramRouter({bot, logger});

      router.register({
        pattern: /^\/test$/,
        useCase: {run: async () => ({})},
        parseInput: () => ({}),
        response: {type: "text", template: "OK"},
      });

      router.registerCommands();

      const ctx = createMockContext("/test", 999);
      await bot._triggerMessage(ctx);

      const infoLogger = logger.info as MockFn;
      assert.strictEqual(infoLogger.mock.calls.length, 1);
      const logContext = infoLogger.mock.calls[0].arguments[0] as Record<string, unknown>;
      assert.strictEqual(logContext.userId, 999);
      assert.strictEqual(infoLogger.mock.calls[0].arguments[1], "Command executed successfully");
    });
  });

  describe("lifecycle", () => {
    it("should call bot.start() on start()", async () => {
      const bot = createMockBot();
      const logger = createMockLogger();
      const router = new TelegramRouter({bot, logger});

      await router.start();

      assert.strictEqual(bot.start.mock.calls.length, 1);
    });

    it("should call bot.stop() on stop()", async () => {
      const bot = createMockBot();
      const logger = createMockLogger();
      const router = new TelegramRouter({bot, logger});

      await router.stop();

      assert.strictEqual(bot.stop.mock.calls.length, 1);
    });
  });
});
