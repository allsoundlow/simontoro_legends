/**
 * Group status values.
 */
export type GroupStatus = "active" | "inactive" | "bot_removed";

/**
 * Group entity - represents a registered Telegram group.
 */
export type Group = {
  pk: number;
  telegram_group_id: string;
  group_name: string;
  admin_pk: number;
  status: GroupStatus;
  created_at: string;
  updated_at: string;
};

/**
 * Data required to create a new group.
 */
export type CreateGroup = {
  telegram_group_id: string;
  group_name: string;
  admin_pk: number;
};

/**
 * Data for updating an existing group (all fields optional).
 */
export type UpdateGroup = {
  group_name?: string;
  status?: GroupStatus;
};

/**
 * Group list item for display purposes.
 */
export type GroupListItem = {
  pk: number;
  telegram_group_id: string;
  group_name: string;
  status: GroupStatus;
  created_at: string;
};
