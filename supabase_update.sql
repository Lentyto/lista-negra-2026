-- ================================================================
-- LISTA NEGRA 2026 — Schema Update
-- Run this in your Supabase SQL Editor
-- ================================================================

-- Add captured status and capture video
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS captured BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS capture_video_url TEXT;

-- Add priority level (1 = highest, 5 = lowest)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 3;
