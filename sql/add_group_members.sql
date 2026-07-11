-- Members table for groups
CREATE TABLE IF NOT EXISTS wintozo_group_members (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  group_id BIGINT NOT NULL REFERENCES wintozo_groups(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, username)
);

ALTER TABLE wintozo_group_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members_read" ON wintozo_group_members;
DROP POLICY IF EXISTS "members_insert" ON wintozo_group_members;
CREATE POLICY "members_read" ON wintozo_group_members FOR SELECT USING (true);
CREATE POLICY "members_insert" ON wintozo_group_members FOR INSERT WITH CHECK (true);

-- Add avatar_url and description to groups
ALTER TABLE wintozo_groups ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE wintozo_groups ADD COLUMN IF NOT EXISTS description TEXT;
