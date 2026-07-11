-- Add avatar_url and description columns to wintozo_users
-- Run this in Supabase SQL Editor

ALTER TABLE wintozo_users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE wintozo_users ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';

-- Create storage bucket for avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('wintozo-avatars', 'wintozo-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
DROP POLICY IF EXISTS "wintozo_avatars_read" ON storage.objects;
DROP POLICY IF EXISTS "wintozo_avatars_insert" ON storage.objects;
DROP POLICY IF EXISTS "wintozo_avatars_update" ON storage.objects;
DROP POLICY IF EXISTS "wintozo_avatars_delete" ON storage.objects;

CREATE POLICY "wintozo_avatars_read" ON storage.objects FOR SELECT USING (bucket_id = 'wintozo-avatars');
CREATE POLICY "wintozo_avatars_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'wintozo-avatars');
CREATE POLICY "wintozo_avatars_update" ON storage.objects FOR UPDATE USING (bucket_id = 'wintozo-avatars');
CREATE POLICY "wintozo_avatars_delete" ON storage.objects FOR DELETE USING (bucket_id = 'wintozo-avatars');