/**
 * Administrator status values.
 */
export type AdminStatus = "active" | "inactive";

/**
 * Administrator entity - represents a registered bot administrator.
 */
export type Admin = {
  pk: number;
  telegram_user_id: string;
  telegram_username: string | null;
  status: AdminStatus;
  created_at: string;
  updated_at: string;
};

/**
 * Data required to create a new admin.
 */
export type CreateAdmin = {
  telegram_user_id: string;
  telegram_username: string | null;
};

/**
 * Data for updating an existing admin (all fields optional).
 */
export type UpdateAdmin = {
  telegram_username?: string | null;
  status?: AdminStatus;
};
