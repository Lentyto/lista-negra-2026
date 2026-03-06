-- ================================================================
-- LISTA NEGRA 2026 — Schema Update v2
-- Run this in your Supabase SQL Editor
-- ================================================================

-- Salas media (photos & videos uploaded directly to Salas)
CREATE TABLE IF NOT EXISTS public.salas_media (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  media_url   TEXT NOT NULL,
  media_type  TEXT NOT NULL CHECK (media_type IN ('photo', 'video')),
  posted_date DATE DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.salas_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "salas_media_select" ON public.salas_media FOR SELECT USING (true);
CREATE POLICY "salas_media_insert" ON public.salas_media FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "salas_media_update" ON public.salas_media FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "salas_media_delete" ON public.salas_media FOR DELETE USING (auth.role() = 'authenticated');

-- Announcements / news
CREATE TABLE IF NOT EXISTS public.announcements (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title      TEXT NOT NULL,
  content    TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "announcements_select" ON public.announcements FOR SELECT USING (true);
CREATE POLICY "announcements_insert" ON public.announcements FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "announcements_update" ON public.announcements FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "announcements_delete" ON public.announcements FOR DELETE USING (auth.role() = 'authenticated');
