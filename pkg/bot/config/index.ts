import z from "zod";

export const logLevelTypes = {
  INFO: "info",
  DEBUG: "debug",
  ERROR: "error",
  TRACE: "trace",
} as const;
export type LogLevel = (typeof logLevelTypes)[keyof typeof logLevelTypes];

export const pgConfigSchema = z.object({
  host: z.string(),
  port: z.number().int().positive(),
  database: z.string(),
  user: z.string(),
  password: z.string(),
});

export type PgConfig = z.infer<typeof pgConfigSchema>;

export const telegramConfigSchema = z.object({
  token: z.string().min(1),
});

export type TelegramConfig = z.infer<typeof telegramConfigSchema>;

export const openRouterConfigSchema = z.object({
  apiKey: z.string().min(1, "OpenRouter API key is required and cannot be empty"),
  defaultModel: z.string().default("openrouter/auto"),
  timeout: z.number().int().positive().default(5000),
  maxRetries: z.number().int().min(0).max(5).default(2),
});

export type OpenRouterConfig = z.infer<typeof openRouterConfigSchema>;

export const aiRoastConfigSchema = z.object({
  enabled: z.boolean().default(true),
  temperature: z.number().min(0).max(2).default(0.8),
  maxTokens: z.number().int().positive().default(150),
});

export type AiRoastConfig = z.infer<typeof aiRoastConfigSchema>;

export const configSchema = z.object({
  port: z.number().int().positive(),
  host: z.string(),
  logger: z.object({
    logLevel: z.enum(Object.values(logLevelTypes) as [string, ...string[]]),
    pretty: z.boolean(),
  }),
  // If no database config → use InMemoryAdapter
  pg: pgConfigSchema.optional(),
  // Telegram bot config - optional to allow running without bot
  telegram: telegramConfigSchema.optional(),
  // OpenRouter AI config - optional for AI features
  openrouter: openRouterConfigSchema.optional(),
  // AI feature configs - optional
  ai: z
    .object({
      roast: aiRoastConfigSchema.optional(),
    })
    .optional(),
});

export type AppConfig = z.infer<typeof configSchema>;

/**
 * Validates configuration and provides clear error messages for missing required fields.
 * @throws {Error} with descriptive message if validation fails
 */
export const validateConfig = (config: unknown): AppConfig => {
  const result = configSchema.safeParse(config);

  if (!result.success) {
    const errors = result.error.issues.map((issue) => {
      const path = issue.path.join(".");
      return `  - ${path || "(root)"}: ${issue.message}`;
    });

    throw new Error(`Configuration validation failed:\n${errors.join("\n")}`);
  }

  return result.data;
};

/**
 * Validates that required AI feature configuration is present when AI features are enabled.
 * Call this after validateConfig() to check feature-specific requirements.
 * @throws {Error} with descriptive message if required AI config is missing
 */
export const validateAiConfig = (config: AppConfig): void => {
  const roastEnabled = config.ai?.roast?.enabled ?? true; // enabled by default

  if (roastEnabled && !config.openrouter) {
    throw new Error(
      "Configuration validation failed:\n" +
        "  - openrouter: OpenRouter configuration is required when AI roast feature is enabled.\n" +
        "    Either provide openrouter config with apiKey, or disable the roast feature by setting ai.roast.enabled to false.",
    );
  }
};
