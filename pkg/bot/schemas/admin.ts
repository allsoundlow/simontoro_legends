import z from "zod";

// Administrator status enum
export const adminStatusSchema = z.enum(["active", "inactive"]);
export type AdminStatus = z.infer<typeof adminStatusSchema>;

// Administrator entity schema
export const adminSchema = z.object({
  pk: z.number().int().positive().describe("Primary key (serial)"),
  telegram_user_id: z.string().describe("Telegram user ID (stored as string for large IDs)"),
  telegram_username: z.string().nullable().describe("Telegram username (may be null)"),
  status: adminStatusSchema.default("active").describe("Account status"),
  created_at: z.string().datetime().describe("Registration timestamp"),
  updated_at: z.string().datetime().describe("Last update timestamp"),
});
export type Admin = z.infer<typeof adminSchema>;

// Create admin request (internal use)
export const createAdminSchema = z.object({
  telegram_user_id: z.string(),
  telegram_username: z.string().nullable(),
});
export type CreateAdminRequest = z.infer<typeof createAdminSchema>;

// Update admin request (internal use)
export const updateAdminSchema = z.object({
  telegram_username: z.string().nullable().optional(),
  status: adminStatusSchema.optional(),
});

export type UpdateAdminRequest = z.infer<typeof updateAdminSchema>;
