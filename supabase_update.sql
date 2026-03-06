-- ================================================================
-- LISTA NEGRA 2026 — Schema Update
-- Run this in your Supabase SQL Editor
-- ================================================================

-- Add captured status and capture video
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS captured BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS capture_video_url TEXT;

-- Add priority level (1 = highest, 5 = lowest)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 3;

-- ================================================================
-- Permissions system (replaces is_super)
-- ================================================================
-- Add permissions JSONB column to admins
-- god role: {"god": true}  (set only in Supabase table editor)
-- other admins: {"image": true, "video": true, "edit": true, "pin": true, "lockdown": true}
ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}'::jsonb;

-- Migrate existing is_super admins to god role
UPDATE public.admins SET permissions = '{"god": true}'::jsonb WHERE is_super = true AND (permissions = '{}'::jsonb OR permissions IS NULL);

-- Add email column to admins for display purposes
ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS email TEXT;
