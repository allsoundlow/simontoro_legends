-- Migration: 20260129001
-- Description: Initial schema - administrators and groups tables
-- Created: 2026-01-29

--------------------------------------------------------------------------------
-- Helper function for auto-updating updated_at timestamp
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

--------------------------------------------------------------------------------
-- Administrators table
-- Stores registered bot administrators identified by Telegram user ID
--------------------------------------------------------------------------------
CREATE TABLE administrators (
  pk                  SERIAL PRIMARY KEY,
  telegram_user_id    VARCHAR(32) NOT NULL UNIQUE,
  telegram_username   VARCHAR(64),
  status              VARCHAR(16) NOT NULL DEFAULT 'active',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookup by Telegram user ID (primary authentication method)
CREATE INDEX idx_administrators_telegram_user_id ON administrators(telegram_user_id);

-- Index for filtering by status
CREATE INDEX idx_administrators_status ON administrators(status);

-- Trigger to auto-update updated_at on row modification
CREATE TRIGGER administrators_updated_at
  BEFORE UPDATE ON administrators
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

--------------------------------------------------------------------------------
-- Groups table
-- Stores Telegram groups registered by administrators
--------------------------------------------------------------------------------
CREATE TABLE groups (
  pk                  SERIAL PRIMARY KEY,
  telegram_group_id   VARCHAR(32) NOT NULL,
  group_name          VARCHAR(256) NOT NULL,
  admin_pk            INTEGER NOT NULL REFERENCES administrators(pk) ON DELETE CASCADE,
  status              VARCHAR(16) NOT NULL DEFAULT 'active',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique index on telegram_group_id (one registration per group)
CREATE UNIQUE INDEX idx_groups_telegram_group_id ON groups(telegram_group_id);

-- Index for efficient lookup of groups by administrator
CREATE INDEX idx_groups_admin_pk ON groups(admin_pk);

-- Index for filtering by status
CREATE INDEX idx_groups_status ON groups(status);

-- Trigger to auto-update updated_at on row modification
CREATE TRIGGER groups_updated_at
  BEFORE UPDATE ON groups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
