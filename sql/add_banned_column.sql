-- Add banned column to wintozo_users
-- Run this in Supabase SQL Editor

ALTER TABLE wintozo_users ADD COLUMN IF NOT EXISTS banned BOOLEAN DEFAULT false;

-- Unban everyone by default
UPDATE wintozo_users SET banned = false WHERE banned IS NULL;
