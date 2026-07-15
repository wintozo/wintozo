-- ============================================
-- WINTOZO — ПОЛНЫЙ SQL СКРИПТ
-- База данных: https://fcafynhlpizcrydscpih.supabase.co
-- ============================================

-- ============================================
-- 1. ТАБЛИЦА ПОЛЬЗОВАТЕЛЕЙ WINTOZO
-- ============================================
CREATE TABLE IF NOT EXISTS wintozo_users (
  username TEXT PRIMARY KEY,
  password_hash TEXT NOT NULL,
  avatar TEXT DEFAULT 'W',
  avatar_url TEXT,
  description TEXT DEFAULT '',
  status TEXT DEFAULT 'offline',
  banned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  pro_status TEXT DEFAULT NULL,
  pro_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  pro_reason TEXT DEFAULT NULL,
  title TEXT DEFAULT NULL,
  admin_contacts INTEGER DEFAULT 2
);

-- ============================================
-- 2. ТАБЛИЦА СООБЩЕНИЙ
-- ============================================
CREATE TABLE IF NOT EXISTS wintozo_messages (
  id SERIAL PRIMARY KEY,
  from_user TEXT NOT NULL REFERENCES wintozo_users(username),
  to_user TEXT NOT NULL REFERENCES wintozo_users(username),
  text TEXT,
  audio_url TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  message_color TEXT DEFAULT NULL,
  reply_to_id INTEGER DEFAULT NULL,
  reply_text TEXT DEFAULT NULL,
  reply_from TEXT DEFAULT NULL
);

-- Индекс для быстрого поиска сообщений
CREATE INDEX IF NOT EXISTS idx_wintozo_messages_users ON wintozo_messages(from_user, to_user);
CREATE INDEX IF NOT EXISTS idx_wintozo_messages_created ON wintozo_messages(created_at DESC);

-- ============================================
-- 3. ТАБЛИЦА ГРУПП
-- ============================================
CREATE TABLE IF NOT EXISTS wintozo_groups (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  creator TEXT NOT NULL REFERENCES wintozo_users(username),
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 4. ТАБЛИЦА ГРУППОВЫХ СООБЩЕНИЙ
-- ============================================
CREATE TABLE IF NOT EXISTS wintozo_group_messages (
  id SERIAL PRIMARY KEY,
  group_id INTEGER NOT NULL REFERENCES wintozo_groups(id) ON DELETE CASCADE,
  from_user TEXT NOT NULL REFERENCES wintozo_users(username),
  text TEXT,
  audio_url TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wintozo_group_messages_group ON wintozo_group_messages(group_id);
CREATE INDEX IF NOT EXISTS idx_wintozo_group_messages_created ON wintozo_group_messages(created_at DESC);

-- ============================================
-- 5. ТАБЛИЦА ПОЛЬЗОВАТЕЛЕЙ БИТВЫ
-- ============================================
CREATE TABLE IF NOT EXISTS wintozo_battle_users (
  username TEXT PRIMARY KEY REFERENCES wintozo_users(username),
  team_emoji TEXT DEFAULT NULL,
  total_score INTEGER DEFAULT 0,
  points_text INTEGER DEFAULT 0,
  points_voice INTEGER DEFAULT 0,
  points_image INTEGER DEFAULT 0,
  last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 6. ТАБЛИЦА КОМАНД БИТВЫ
-- ============================================
CREATE TABLE IF NOT EXISTS wintozo_battle_teams (
  emoji TEXT PRIMARY KEY,
  total_points INTEGER DEFAULT 0,
  member_count INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 7. ТАБЛИЦА ИСТОРИИ БИТВЫ
-- ============================================
CREATE TABLE IF NOT EXISTS wintozo_battle_history (
  id SERIAL PRIMARY KEY,
  week_start TIMESTAMP WITH TIME ZONE NOT NULL,
  week_end TIMESTAMP WITH TIME ZONE NOT NULL,
  winning_emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 8. ТАБЛИЦА ВАРНОВ (ПРЕДУПРЕЖДЕНИЯ)
-- ============================================
CREATE TABLE IF NOT EXISTS wintozo_warnings (
  id SERIAL PRIMARY KEY,
  target_user TEXT NOT NULL REFERENCES wintozo_users(username),
  warned_by TEXT NOT NULL REFERENCES wintozo_users(username),
  reason TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wintozo_warnings_target ON wintozo_warnings(target_user);

-- ============================================
-- 9. ТАБЛИЦА ПРО-ПОЛЬЗОВАТЕЛЕЙ
-- ============================================
CREATE TABLE IF NOT EXISTS wintozo_pro (
  username TEXT PRIMARY KEY REFERENCES wintozo_users(username),
  status TEXT DEFAULT 'inactive',
  end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  reason TEXT DEFAULT NULL,
  message_color TEXT DEFAULT NULL,
  admin_contacts INTEGER DEFAULT 2,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 10. ТАБЛИЦА ОБЪЯВЛЕНИЙ
-- ============================================
CREATE TABLE IF NOT EXISTS wintozo_announcements (
  id SERIAL PRIMARY KEY,
  message TEXT NOT NULL,
  storage_key TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 11. ТАБЛИЦА ПОЛЬЗОВАТЕЛЕЙ ДЕРЕВНИ СОЛНЕЧНАЯ
-- ============================================
CREATE TABLE IF NOT EXISTS solnechnaya_users (
  username TEXT PRIMARY KEY,
  password_hash TEXT NOT NULL,
  avatar TEXT DEFAULT 'W',
  avatar_url TEXT,
  description TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 12. ТАБЛИЦА СООБЩЕНИЙ СОЛНЕЧНОЙ
-- ============================================
CREATE TABLE IF NOT EXISTS solnechnaya_messages (
  id SERIAL PRIMARY KEY,
  from_user TEXT NOT NULL REFERENCES solnechnaya_users(username),
  to_user TEXT NOT NULL REFERENCES solnechnaya_users(username),
  text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_solnechnaya_messages_users ON solnechnaya_messages(from_user, to_user);
CREATE INDEX IF NOT EXISTS idx_solnechnaya_messages_created ON solnechnaya_messages(created_at DESC);

-- ============================================
-- RLS (Row Level Security) — защита таблиц
-- ============================================

-- Включаем RLS для всех таблиц
ALTER TABLE wintozo_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE wintozo_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE wintozo_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE wintozo_group_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE wintozo_battle_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE wintozo_battle_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE wintozo_battle_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE wintozo_warnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE wintozo_pro ENABLE ROW LEVEL SECURITY;
ALTER TABLE wintozo_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE solnechnaya_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE solnechnaya_messages ENABLE ROW LEVEL SECURITY;

-- Wintozo: все авторизованные пользователи могут читать свои данные
CREATE POLICY "wintozo_users_select" ON wintozo_users FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "wintozo_users_insert" ON wintozo_users FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "wintozo_users_update" ON wintozo_users FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Сообщения: могут читать обе стороны переписки
CREATE POLICY "wintozo_messages_select" ON wintozo_messages FOR SELECT
  USING (auth.uid()::text = from_user OR auth.uid()::text = to_user);

CREATE POLICY "wintozo_messages_insert" ON wintozo_messages FOR INSERT
  WITH CHECK (auth.uid()::text = from_user);

CREATE POLICY "wintozo_messages_update" ON wintozo_messages FOR UPDATE
  USING (auth.uid()::text = from_user);

-- Группы
CREATE POLICY "wintozo_groups_select" ON wintozo_groups FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "wintozo_groups_insert" ON wintozo_groups FOR INSERT
  WITH CHECK (auth.uid()::text = creator);

CREATE POLICY "wintozo_groups_update" ON wintozo_groups FOR UPDATE
  USING (auth.uid()::text = creator);

-- Групповые сообщения
CREATE POLICY "wintozo_group_messages_select" ON wintozo_group_messages FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "wintozo_group_messages_insert" ON wintozo_group_messages FOR INSERT
  WITH CHECK (auth.uid()::text = from_user);

-- Battle
CREATE POLICY "wintozo_battle_users_select" ON wintozo_battle_users FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "wintozo_battle_users_insert" ON wintozo_battle_users FOR INSERT
  WITH CHECK (auth.uid()::text = username);

CREATE POLICY "wintozo_battle_users_update" ON wintozo_battle_users FOR UPDATE
  USING (auth.uid()::text = username);

CREATE POLICY "wintozo_battle_teams_select" ON wintozo_battle_teams FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "wintozo_battle_teams_update" ON wintozo_battle_teams FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "wintozo_battle_history_select" ON wintozo_battle_history FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Warnings
CREATE POLICY "wintozo_warnings_select" ON wintozo_warnings FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "wintozo_warnings_insert" ON wintozo_warnings FOR INSERT
  WITH CHECK (auth.uid()::text = warned_by);

-- Pro
CREATE POLICY "wintozo_pro_select" ON wintozo_pro FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "wintozo_pro_insert" ON wintozo_pro FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "wintozo_pro_update" ON wintozo_pro FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Announcements
CREATE POLICY "wintozo_announcements_select" ON wintozo_announcements FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Solnechnaya
CREATE POLICY "solnechnaya_users_select" ON solnechnaya_users FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "solnechnaya_users_insert" ON solnechnaya_users FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "solnechnaya_messages_select" ON solnechnaya_messages FOR SELECT
  USING (auth.uid()::text = from_user OR auth.uid()::text = to_user);

CREATE POLICY "solnechnaya_messages_insert" ON solnechnaya_messages FOR INSERT
  WITH CHECK (auth.uid()::text = from_user);

-- ============================================
-- ХРАНИЛИЩЕ (STORAGE BUCKETS)
-- ============================================

-- Создаём buckets (если ещё нет)
INSERT INTO storage.buckets (id, name, public) VALUES ('wintozo-avatars', 'wintozo-avatars', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('wintozo-voice', 'wintozo-voice', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('wintozo-photos', 'wintozo-photos', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('solnechnaya-avatars', 'solnechnaya-avatars', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('solnechnaya-photos', 'solnechnaya-photos', true) ON CONFLICT DO NOTHING;

-- Политики для storage
-- wintozo-avatars
CREATE POLICY "wintozo_avatars_public_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'wintozo-avatars');
CREATE POLICY "wintozo_avatars_public_write" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'wintozo-avatars' AND auth.uid() IS NOT NULL);
CREATE POLICY "wintozo_avatars_update" ON storage.objects FOR UPDATE
  USING (bucket_id = 'wintozo-avatars' AND auth.uid() IS NOT NULL);
CREATE POLICY "wintozo_avatars_delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'wintozo-avatars' AND auth.uid() IS NOT NULL);

-- wintozo-voice
CREATE POLICY "wintozo_voice_public_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'wintozo-voice');
CREATE POLICY "wintozo_voice_public_write" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'wintozo-voice' AND auth.uid() IS NOT NULL);

-- wintozo-photos
CREATE POLICY "wintozo_photos_public_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'wintozo-photos');
CREATE POLICY "wintozo_photos_public_write" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'wintozo-photos' AND auth.uid() IS NOT NULL);
CREATE POLICY "wintozo_photos_update" ON storage.objects FOR UPDATE
  USING (bucket_id = 'wintozo-photos' AND auth.uid() IS NOT NULL);
CREATE POLICY "wintozo_photos_delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'wintozo-photos' AND auth.uid() IS NOT NULL);

-- solnechnaya-avatars
CREATE POLICY "solnechnaya_avatars_public_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'solnechnaya-avatars');
CREATE POLICY "solnechnaya_avatars_public_write" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'solnechnaya-avatars' AND auth.uid() IS NOT NULL);

-- solnechnaya-photos
CREATE POLICY "solnechnaya_photos_public_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'solnechnaya-photos');
CREATE POLICY "solnechnaya_photos_public_write" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'solnechnaya-photos' AND auth.uid() IS NOT NULL);

-- ============================================
-- ГОТОВО! ✅
-- ============================================
-- 
-- Для входа как админ:
-- 1. Зарегистрируйте аккаунт "Admin" в обычном чате
-- 2. Перейдите на /admin/registration
-- 3. Пароль: 2015Nikita2015
--
-- Команды терминала:
-- /ban [ID] [причина]    — Заблокировать
-- /unban [ID]            — Разблокировать
-- /mute [ID] [время]     — Замутить (10m, 1h, 1d)
-- /warn [ID]             — Выдать варн (3 = бан)
-- /kick [ID]             — Исключить из чатов
-- /give w-pro (ник) X    — Выдать Pro на X дней
-- /remove w-pro (ник)    — Забрать Pro
-- /tittle give (ник) X   — Выдать титул (owner/tester/Spidi)
-- /tittle remove (ник) X — Забрать титул
-- /users                 — Список пользователей
-- /clear                 — Очистить терминал
