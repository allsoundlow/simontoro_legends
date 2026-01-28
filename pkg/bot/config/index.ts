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

export const configSchema = z.object({
  port: z.number().int().positive(),
  host: z.string(),
  logger: z.object({
    logLevel: z.enum(Object.values(logLevelTypes) as [string, ...string[]]),
    pretty: z.boolean(),
  }),
  // If no database config → use InMemoryAdapter
  pg: pgConfigSchema.optional(),
});

export type AppConfig = z.infer<typeof configSchema>;
export const validateConfig = (config: unknown): AppConfig => {
  return configSchema.parse(config);
};
