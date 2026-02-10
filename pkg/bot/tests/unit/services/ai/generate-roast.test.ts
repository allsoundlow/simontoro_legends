import assert from "node:assert";
import {beforeEach, describe, it, mock} from "node:test";

import type {OpenRouterClient} from "../../../../connectors/openrouter/client";
import {NotFoundError, RateLimitError, ValidationError} from "../../../../errors";
import {createRepositories, Repositories} from "../../../../repositories";
import {type AiDependencies, GenerateRoast} from "../../../../services/ai/generate-roast";
import type {Dependencies} from "../../../../services/base";
import {type Connection, createConnection} from "../../../../storage";
import {RateLimiter} from "../../../../utils/rate-limiter";

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

type CompletionRequest = {
  systemPrompt: string;
  userPrompt: string;
  temperature: number;
  maxTokens: number;
};

function createMockOpenRouterClient(response: string = "You got roasted!"): OpenRouterClient {
  return {
    generateCompletion: mock.fn(async () => response),
  } as unknown as OpenRouterClient;
}

describe("GenerateRoast Use Case", () => {
  let connection: Connection;
  let repos: Repositories;
  let rateLimiter: RateLimiter;
  let mockOpenRouterClient: OpenRouterClient;
  let deps: AiDependencies;

  beforeEach(() => {
    connection = createConnection({});
    repos = createRepositories(connection);
    rateLimiter = new RateLimiter();
    mockOpenRouterClient = createMockOpenRouterClient();
    deps = {connection, logger: mockLogger, repos, openRouterClient: mockOpenRouterClient, rateLimiter};
  });

  async function createAdminAndGroup(
    adminTelegramId: string,
    groupTelegramId: string,
    groupStatus: "active" | "inactive" | "bot_removed" = "active",
  ) {
    const admin = await repos.admin.create({
      telegram_user_id: adminTelegramId,
      telegram_username: "testadmin",
    });
    const group = await repos.group.create({
      telegram_group_id: groupTelegramId,
      group_name: "Test Group",
      admin_pk: admin.pk,
    });
    if (groupStatus !== "active") {
      await repos.group.update(group.pk, {status: groupStatus});
    }
    return {admin, group};
  }


  describe("Group validation", () => {
    it("should throw NotFoundError when group is not registered", async () => {
      const useCase = new GenerateRoast(deps);

      await assert.rejects(
        () =>
          useCase.run({
            targetUsername: "victim",
            level: "hard",
            groupId: "-999999",
            requesterId: "123",
          }),
        NotFoundError,
      );
    });

    it("should throw ValidationError when group is inactive", async () => {
      await createAdminAndGroup("admin1", "-100123", "inactive");
      const useCase = new GenerateRoast(deps);

      await assert.rejects(
        () =>
          useCase.run({
            targetUsername: "victim",
            level: "hard",
            groupId: "-100123",
            requesterId: "123",
          }),
        ValidationError,
      );
    });

    it("should throw ValidationError when group has bot_removed status", async () => {
      await createAdminAndGroup("admin1", "-100123", "bot_removed");
      const useCase = new GenerateRoast(deps);

      await assert.rejects(
        () =>
          useCase.run({
            targetUsername: "victim",
            level: "hard",
            groupId: "-100123",
            requesterId: "123",
          }),
        ValidationError,
      );
    });
  });

  describe("Rate limit enforcement", () => {
    it("should throw RateLimitError when user exceeds 5 requests per minute", async () => {
      await createAdminAndGroup("admin1", "-100123");
      const useCase = new GenerateRoast(deps);

      // Make 5 successful requests
      for (let i = 0; i < 5; i++) {
        await useCase.run({
          targetUsername: "victim",
          level: "hard",
          groupId: "-100123",
          requesterId: "user1",
        });
      }

      // 6th request should fail
      await assert.rejects(
        () =>
          useCase.run({
            targetUsername: "victim",
            level: "hard",
            groupId: "-100123",
            requesterId: "user1",
          }),
        RateLimitError,
      );
    });

    it("should throw RateLimitError when group exceeds 20 requests per minute", async () => {
      await createAdminAndGroup("admin1", "-100123");
      const useCase = new GenerateRoast(deps);

      // Make 20 successful requests from different users
      for (let i = 0; i < 20; i++) {
        await useCase.run({
          targetUsername: "victim",
          level: "hard",
          groupId: "-100123",
          requesterId: `user${i}`,
        });
      }

      // 21st request should fail (group limit)
      await assert.rejects(
        () =>
          useCase.run({
            targetUsername: "victim",
            level: "hard",
            groupId: "-100123",
            requesterId: "user99",
          }),
        RateLimitError,
      );
    });

    it("should throw RateLimitError when global limit of 100 is exceeded", async () => {
      // Create multiple groups to avoid group rate limit
      for (let g = 0; g < 10; g++) {
        await createAdminAndGroup(`admin${g}`, `-10000${g}`);
      }
      const useCase = new GenerateRoast(deps);

      // Make 100 successful requests across different groups and users
      for (let i = 0; i < 100; i++) {
        const groupIndex = Math.floor(i / 10);
        await useCase.run({
          targetUsername: "victim",
          level: "hard",
          groupId: `-10000${groupIndex}`,
          requesterId: `user${i}`,
        });
      }

      // 101st request should fail (global limit)
      await assert.rejects(
        () =>
          useCase.run({
            targetUsername: "victim",
            level: "hard",
            groupId: "-100000",
            requesterId: "user999",
          }),
        RateLimitError,
      );
    });
  });


  describe("Prompt construction", () => {
    it("should construct soft level prompt correctly", async () => {
      await createAdminAndGroup("admin1", "-100123");
      const mockClient = createMockOpenRouterClient("Gentle roast here");
      const localDeps: AiDependencies = {...deps, openRouterClient: mockClient};
      const useCase = new GenerateRoast(localDeps);

      await useCase.run({
        targetUsername: "victim",
        level: "soft",
        groupId: "-100123",
        requesterId: "123",
      });

      const generateCompletionMock = mockClient.generateCompletion as unknown as ReturnType<typeof mock.fn>;
      assert.strictEqual(generateCompletionMock.mock.calls.length, 1);
      const callArgs = generateCompletionMock.mock.calls[0].arguments[0] as CompletionRequest;
      assert.ok(callArgs.systemPrompt.includes("SOFT"));
      assert.ok(callArgs.systemPrompt.includes("Light and gentle"));
      assert.ok(callArgs.userPrompt.includes("@victim"));
    });

    it("should construct hard level prompt correctly", async () => {
      await createAdminAndGroup("admin1", "-100123");
      const mockClient = createMockOpenRouterClient("Classic roast here");
      const localDeps: AiDependencies = {...deps, openRouterClient: mockClient};
      const useCase = new GenerateRoast(localDeps);

      await useCase.run({
        targetUsername: "victim",
        level: "hard",
        groupId: "-100123",
        requesterId: "123",
      });

      const generateCompletionMock = mockClient.generateCompletion as unknown as ReturnType<typeof mock.fn>;
      const callArgs = generateCompletionMock.mock.calls[0].arguments[0] as CompletionRequest;
      assert.ok(callArgs.systemPrompt.includes("HARD"));
      assert.ok(callArgs.systemPrompt.includes("Witty burns"));
    });

    it("should construct extra level prompt correctly", async () => {
      await createAdminAndGroup("admin1", "-100123");
      const mockClient = createMockOpenRouterClient("Savage roast here");
      const localDeps: AiDependencies = {...deps, openRouterClient: mockClient};
      const useCase = new GenerateRoast(localDeps);

      await useCase.run({
        targetUsername: "victim",
        level: "extra",
        groupId: "-100123",
        requesterId: "123",
      });

      const generateCompletionMock = mockClient.generateCompletion as unknown as ReturnType<typeof mock.fn>;
      const callArgs = generateCompletionMock.mock.calls[0].arguments[0] as CompletionRequest;
      assert.ok(callArgs.systemPrompt.includes("EXTRA"));
      assert.ok(callArgs.systemPrompt.includes("Maximum Roast Energy"));
    });
  });

  describe("Context inclusion", () => {
    it("should include context in user prompt when provided", async () => {
      await createAdminAndGroup("admin1", "-100123");
      const mockClient = createMockOpenRouterClient("Context-aware roast");
      const localDeps: AiDependencies = {...deps, openRouterClient: mockClient};
      const useCase = new GenerateRoast(localDeps);

      await useCase.run({
        targetUsername: "victim",
        level: "hard",
        context: "always loses at chess",
        groupId: "-100123",
        requesterId: "123",
      });

      const generateCompletionMock = mockClient.generateCompletion as unknown as ReturnType<typeof mock.fn>;
      const callArgs = generateCompletionMock.mock.calls[0].arguments[0] as CompletionRequest;
      assert.ok(callArgs.userPrompt.includes("Context: always loses at chess"));
    });

    it("should not include context line when context is not provided", async () => {
      await createAdminAndGroup("admin1", "-100123");
      const mockClient = createMockOpenRouterClient("Generic roast");
      const localDeps: AiDependencies = {...deps, openRouterClient: mockClient};
      const useCase = new GenerateRoast(localDeps);

      await useCase.run({
        targetUsername: "victim",
        level: "hard",
        groupId: "-100123",
        requesterId: "123",
      });

      const generateCompletionMock = mockClient.generateCompletion as unknown as ReturnType<typeof mock.fn>;
      const callArgs = generateCompletionMock.mock.calls[0].arguments[0] as CompletionRequest;
      assert.ok(!callArgs.userPrompt.includes("Context:"));
      assert.strictEqual(callArgs.userPrompt, "Target: @victim");
    });
  });


  describe("OpenRouter client error handling", () => {
    it("should propagate RateLimitError from OpenRouter client", async () => {
      await createAdminAndGroup("admin1", "-100123");
      const mockClient = {
        generateCompletion: mock.fn(async () => {
          throw new RateLimitError("OpenRouter rate limit exceeded", 60);
        }),
      } as unknown as OpenRouterClient;
      const localDeps: AiDependencies = {...deps, openRouterClient: mockClient};
      const useCase = new GenerateRoast(localDeps);

      await assert.rejects(
        () =>
          useCase.run({
            targetUsername: "victim",
            level: "hard",
            groupId: "-100123",
            requesterId: "123",
          }),
        RateLimitError,
      );
    });

    it("should propagate timeout error from OpenRouter client", async () => {
      await createAdminAndGroup("admin1", "-100123");
      const mockClient = {
        generateCompletion: mock.fn(async () => {
          throw new Error("The roast generator is taking a coffee break ☕");
        }),
      } as unknown as OpenRouterClient;
      const localDeps: AiDependencies = {...deps, openRouterClient: mockClient};
      const useCase = new GenerateRoast(localDeps);

      await assert.rejects(
        () =>
          useCase.run({
            targetUsername: "victim",
            level: "hard",
            groupId: "-100123",
            requesterId: "123",
          }),
        {message: /coffee break/},
      );
    });

    it("should propagate generic errors from OpenRouter client", async () => {
      await createAdminAndGroup("admin1", "-100123");
      const mockClient = {
        generateCompletion: mock.fn(async () => {
          throw new Error("Network error");
        }),
      } as unknown as OpenRouterClient;
      const localDeps: AiDependencies = {...deps, openRouterClient: mockClient};
      const useCase = new GenerateRoast(localDeps);

      await assert.rejects(
        () =>
          useCase.run({
            targetUsername: "victim",
            level: "hard",
            groupId: "-100123",
            requesterId: "123",
          }),
        {message: "Network error"},
      );
    });
  });

  describe("Successful roast generation", () => {
    it("should return roast from OpenRouter client", async () => {
      await createAdminAndGroup("admin1", "-100123");
      const expectedRoast = "You call that a username? My grandma has better creativity!";
      const mockClient = createMockOpenRouterClient(expectedRoast);
      const localDeps: AiDependencies = {...deps, openRouterClient: mockClient};
      const useCase = new GenerateRoast(localDeps);

      const result = await useCase.run({
        targetUsername: "victim",
        level: "hard",
        groupId: "-100123",
        requesterId: "123",
      });

      assert.strictEqual(result.roast, expectedRoast);
    });
  });
});
