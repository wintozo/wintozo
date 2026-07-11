-- Groups + photo bucket
-- Run this in Supabase SQL Editor

-- Group messages table
CREATE TABLE IF NOT EXISTS wintozo_group_messages (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  group_id BIGINT NOT NULL,
  from_user TEXT NOT NULL,
  text TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE wintozo_group_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "group_msg_read" ON wintozo_group_messages;
DROP POLICY IF EXISTS "group_msg_insert" ON wintozo_group_messages;
CREATE POLICY "group_msg_read" ON wintozo_group_messages FOR SELECT USING (true);
CREATE POLICY "group_msg_insert" ON wintozo_group_messages FOR INSERT WITH CHECK (true);

-- Photos bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('wintozo-photos', 'wintozo-photos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "wintozo_photos_read" ON storage.objects;
DROP POLICY IF EXISTS "wintozo_photos_insert" ON storage.objects;
DROP POLICY IF EXISTS "wintozo_photos_update" ON storage.objects;
DROP POLICY IF EXISTS "wintozo_photos_delete" ON storage.objects;

CREATE POLICY "wintozo_photos_read" ON storage.objects FOR SELECT USING (bucket_id = 'wintozo-photos');
CREATE POLICY "wintozo_photos_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'wintozo-photos');
CREATE POLICY "wintozo_photos_update" ON storage.objects FOR UPDATE USING (bucket_id = 'wintozo-photos');
CREATE POLICY "wintozo_photos_delete" ON storage.objects FOR DELETE USING (bucket_id = 'wintozo-photos');

-- Realtime
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime DROP TABLE wintozo_group_messages;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE wintozo_group_messages;
