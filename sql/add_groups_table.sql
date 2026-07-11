-- Groups table with names
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS wintozo_groups (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT DEFAULT '',
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE wintozo_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "groups_read" ON wintozo_groups;
DROP POLICY IF EXISTS "groups_insert" ON wintozo_groups;
DROP POLICY IF EXISTS "groups_update" ON wintozo_groups;
CREATE POLICY "groups_read" ON wintozo_groups FOR SELECT USING (true);
CREATE POLICY "groups_insert" ON wintozo_groups FOR INSERT WITH CHECK (true);
CREATE POLICY "groups_update" ON wintozo_groups FOR UPDATE USING (true);

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime DROP TABLE wintozo_groups;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE wintozo_groups;
