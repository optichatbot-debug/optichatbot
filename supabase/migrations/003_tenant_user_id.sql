-- Migration 003: Add user_id to tenants for auth-based lookup
-- Run in: Supabase SQL Editor → New Query

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS user_id TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_tenants_user_id ON tenants(user_id);
