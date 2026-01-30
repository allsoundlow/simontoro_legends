/**
 * Pattern matching type for keywords.
 */
export type PatternType = "exact" | "phrase" | "wildcard";

/**
 * Keyword entity - represents a keyword trigger for notifications.
 */
export type Keyword = {
  pk: number;
  group_id: number;
  pattern: string;
  pattern_type: PatternType;
  case_sensitive: boolean;
  cooldown_seconds: number;
  created_at: string;
  updated_at: string;
};

/**
 * Data required to create a new keyword.
 */
export type CreateKeyword = {
  pattern: string;
  pattern_type?: PatternType;
  case_sensitive?: boolean;
  cooldown_seconds?: number;
};

/**
 * Data for updating an existing keyword (all fields optional).
 */
export type UpdateKeyword = {
  pattern?: string;
  pattern_type?: PatternType;
  case_sensitive?: boolean;
  cooldown_seconds?: number;
};
