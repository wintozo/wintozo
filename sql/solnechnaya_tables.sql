-- Solnechnaya chat tables
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS solnechnaya_users (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  avatar TEXT DEFAULT '🌻',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS solnechnaya_messages (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  username TEXT NOT NULL,
  text TEXT NOT NULL,
  avatar TEXT DEFAULT '🌻',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE solnechnaya_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE solnechnaya_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "solnechnaya_read" ON solnechnaya_messages;
DROP POLICY IF EXISTS "solnechnaya_insert" ON solnechnaya_messages;
DROP POLICY IF EXISTS "solnechnaya_users_read" ON solnechnaya_users;
DROP POLICY IF EXISTS "solnechnaya_users_insert" ON solnechnaya_users;

CREATE POLICY "solnechnaya_read" ON solnechnaya_messages FOR SELECT USING (true);
CREATE POLICY "solnechnaya_insert" ON solnechnaya_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "solnechnaya_users_read" ON solnechnaya_users FOR SELECT USING (true);
CREATE POLICY "solnechnaya_users_insert" ON solnechnaya_users FOR INSERT WITH CHECK (true);

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime DROP TABLE solnechnaya_messages;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE solnechnaya_messages;