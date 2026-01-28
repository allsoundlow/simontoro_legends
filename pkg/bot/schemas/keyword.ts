import z from "zod";

import {paginationQuerySchema, paginationSchema} from "./common/pagination";

// Pattern type enum
export const patternTypeSchema = z.enum(["exact", "phrase", "wildcard"]);
export type PatternType = z.infer<typeof patternTypeSchema>;

// Base keyword fields
const keywordBaseSchema = z.object({
  pattern: z.string().min(1).max(100).describe("The keyword pattern to match"),
  pattern_type: patternTypeSchema.default("exact").describe("How the pattern should be matched"),
  case_sensitive: z.boolean().default(false).describe("Whether matching is case-sensitive"),
  cooldown_seconds: z
    .number()
    .int()
    .min(0)
    .max(86400)
    .default(0)
    .describe("Cooldown period in seconds between notifications (0 = no cooldown)"),
});

// Create request schema
export const createKeywordSchema = keywordBaseSchema.strict();
export type CreateKeywordRequest = z.infer<typeof createKeywordSchema>;

// Update request schema (all fields optional for partial updates, no defaults)
export const updateKeywordSchema = z
  .object({
    pattern: z.string().min(1).max(100).describe("The keyword pattern to match"),
    pattern_type: patternTypeSchema.describe("How the pattern should be matched"),
    case_sensitive: z.boolean().describe("Whether matching is case-sensitive"),
    cooldown_seconds: z
      .number()
      .int()
      .min(0)
      .max(86400)
      .describe("Cooldown period in seconds between notifications (0 = no cooldown)"),
  })
  .partial()
  .strict();
export type UpdateKeywordRequest = z.infer<typeof updateKeywordSchema>;

// Keyword entity schema (internal)
export const keywordSchema = keywordBaseSchema.extend({
  pk: z.number().int().positive().describe("Primary key identifier"),
  group_id: z.number().int().positive().describe("ID of the group this keyword belongs to"),
  created_at: z.string().datetime().describe("ISO 8601 timestamp of creation"),
  updated_at: z.string().datetime().describe("ISO 8601 timestamp of last update"),
});
export type Keyword = z.infer<typeof keywordSchema>;

// Single keyword response schema (wrapped in data)
export const keywordResponseSchema = z.object({
  data: keywordSchema,
});
export type KeywordResponse = z.infer<typeof keywordResponseSchema>;

// List response schema
export const keywordListSchema = z.object({
  data: z.array(keywordSchema),
  pagination: paginationSchema,
});
export type KeywordListResponse = z.infer<typeof keywordListSchema>;

// Path parameters
export const groupIdParamSchema = z.object({
  groupId: z.coerce.number().int().positive().describe("Group identifier"),
});
export type GroupIdParam = z.infer<typeof groupIdParamSchema>;

export const keywordIdParamSchema = groupIdParamSchema.extend({
  keywordId: z.coerce.number().int().positive().describe("Keyword primary key"),
});
export type KeywordIdParam = z.infer<typeof keywordIdParamSchema>;

// Query parameters for list endpoint (extends common pagination)
export const listKeywordsQuerySchema = paginationQuerySchema.extend({
  pattern_type: patternTypeSchema.optional(),
});
export type ListKeywordsQuery = z.infer<typeof listKeywordsQuerySchema>;
