import {setTimeout} from "node:timers/promises";

import {OpenRouter} from "@openrouter/sdk";
import type {FastifyBaseLogger} from "fastify";
import z from "zod";

import {RateLimitError} from "../../errors";

// Request schema
const completionRequestSchema = z.object({
  systemPrompt: z.string(),
  userPrompt: z.string(),
  temperature: z.number().min(0).max(2).default(0.8),
  maxTokens: z.number().int().positive().default(150),
});

type CompletionRequest = z.infer<typeof completionRequestSchema>;

// Configuration
type OpenRouterConfig = {apiKey: string; defaultModel: string; timeout: number; maxRetries: number};

export class OpenRouterClient {
  private client: OpenRouter;

  constructor(
    private config: OpenRouterConfig,
    private logger: FastifyBaseLogger,
  ) {
    this.client = new OpenRouter({apiKey: config.apiKey});
  }

  async generateCompletion(request: CompletionRequest): Promise<string> {
    const validated = completionRequestSchema.parse(request);

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        // Note: The SDK doesn't support maxTokens parameter in callModel
        // The default token limit is sufficient for short roast responses
        const result = this.client.callModel({
          model: this.config.defaultModel,
          input: [
            {role: "system", content: validated.systemPrompt},
            {role: "user", content: validated.userPrompt},
          ],
          temperature: validated.temperature,
        });

        // Set timeout using Promise.race
        const timeoutPromise = new Promise<never>((_, reject) => {
          globalThis.setTimeout(() => {
            reject(new Error("The roast generator is taking a coffee break ☕"));
          }, this.config.timeout);
        });

        const text = await Promise.race([result.getText(), timeoutPromise]);

        if (!text || text.trim().length === 0) {
          throw new Error("Empty content in OpenRouter response");
        }

        return text.trim();
      } catch (error) {
        lastError = error as Error;

        // Check for rate limit errors
        if (lastError.message.includes("429") || lastError.message.includes("rate limit")) {
          throw new RateLimitError("OpenRouter rate limit exceeded", 60);
        }

        // Don't retry on timeout errors
        if (lastError.message.includes("coffee break")) {
          throw lastError;
        }

        if (attempt < this.config.maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          this.logger.warn(
            {attempt, delay, error: lastError.message},
            "Retrying OpenRouter request",
          );
          await setTimeout(delay);
        }
      }
    }

    this.logger.error({error: lastError?.message}, "OpenRouter request failed after retries");
    throw lastError ?? new Error("OpenRouter request failed");
  }
}
