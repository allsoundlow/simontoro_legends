import z from "zod";

// Group status enum
export const groupStatusSchema = z.enum(["active", "inactive", "bot_removed"]);
export type GroupStatus = z.infer<typeof groupStatusSchema>;

// Group entity schema
export const groupSchema = z.object({
  pk: z.number().int().positive().describe("Primary key (serial)"),
  telegram_group_id: z.string().describe("Telegram group/chat ID (stored as string)"),
  group_name: z.string().describe("Group name at registration time"),
  admin_pk: z.number().int().positive().describe("FK to administrator who registered the group"),
  status: groupStatusSchema.default("active").describe("Group status"),
  created_at: z.string().datetime().describe("Registration timestamp"),
  updated_at: z.string().datetime().describe("Last update timestamp"),
});
export type Group = z.infer<typeof groupSchema>;

// Create group request (internal use)
export const createGroupSchema = z.object({
  telegram_group_id: z.string(),
  group_name: z.string(),
  admin_pk: z.number().int().positive(),
});
export type CreateGroupRequest = z.infer<typeof createGroupSchema>;

// Update group request (internal use)
export const updateGroupSchema = z.object({
  group_name: z.string().optional(),
  status: groupStatusSchema.optional(),
});
export type UpdateGroupRequest = z.infer<typeof updateGroupSchema>;

// Group list item for /groups command response
export const groupListItemSchema = z.object({
  pk: z.number().int().positive(),
  telegram_group_id: z.string(),
  group_name: z.string(),
  status: groupStatusSchema,
  created_at: z.string().datetime(),
});
export type GroupListItem = z.infer<typeof groupListItemSchema>;
