-- Create storage bucket for voice messages
-- Run this in Supabase SQL Editor

INSERT INTO storage.buckets (id, name, public)
VALUES ('wintozo-voice', 'wintozo-voice', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "wintozo_voice_read" ON storage.objects;
DROP POLICY IF EXISTS "wintozo_voice_insert" ON storage.objects;
DROP POLICY IF EXISTS "wintozo_voice_update" ON storage.objects;
DROP POLICY IF EXISTS "wintozo_voice_delete" ON storage.objects;

CREATE POLICY "wintozo_voice_read" ON storage.objects FOR SELECT USING (bucket_id = 'wintozo-voice');
CREATE POLICY "wintozo_voice_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'wintozo-voice');
CREATE POLICY "wintozo_voice_update" ON storage.objects FOR UPDATE USING (bucket_id = 'wintozo-voice');
CREATE POLICY "wintozo_voice_delete" ON storage.objects FOR DELETE USING (bucket_id = 'wintozo-voice');
