-- ================================================================
-- LISTA NEGRA 2026 — Supabase Database Setup
-- Run this ENTIRE script in your Supabase SQL Editor (one go).
-- ================================================================

-- ── 1. PROFILES TABLE ──
CREATE TABLE public.profiles (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  photo_url  TEXT,
  crime      TEXT NOT NULL,
  reward     TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Anyone can view profiles
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT USING (true);

-- Only authenticated users (admins checked at app level) can insert/update/delete
CREATE POLICY "profiles_insert" ON public.profiles
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "profiles_delete" ON public.profiles
  FOR DELETE USING (auth.role() = 'authenticated');


-- ── 2. PINS TABLE ──
CREATE TABLE public.pins (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label     TEXT UNIQUE NOT NULL,  -- 'gallery' or 'admin'
  pin_value TEXT NOT NULL
);

ALTER TABLE public.pins ENABLE ROW LEVEL SECURITY;

-- Anyone can read PINs (needed for PIN entry check)
CREATE POLICY "pins_select" ON public.pins
  FOR SELECT USING (true);

-- Only authenticated users can update PINs
CREATE POLICY "pins_update" ON public.pins
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Seed default PINs
INSERT INTO public.pins (label, pin_value) VALUES
  ('gallery', '2025'),
  ('admin',   '2026');


-- ── 3. ADMINS TABLE ──
CREATE TABLE public.admins (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_super   BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- Admins can read the admin list
CREATE POLICY "admins_select" ON public.admins
  FOR SELECT USING (auth.role() = 'authenticated');

-- Only super-admins can insert new admins
CREATE POLICY "admins_insert" ON public.admins
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid() AND is_super = true)
  );

-- Only super-admins can delete admins
CREATE POLICY "admins_delete" ON public.admins
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid() AND is_super = true)
  );


-- ── 4. SETTINGS TABLE ──
CREATE TABLE public.settings (
  id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key   TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL
);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read settings (lockdown check needs this)
CREATE POLICY "settings_select" ON public.settings
  FOR SELECT USING (true);

-- Only authenticated users can update settings
CREATE POLICY "settings_update" ON public.settings
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Seed lockdown setting
INSERT INTO public.settings (key, value) VALUES
  ('lockdown', 'false');


-- ── 5. STORAGE BUCKET ──
-- Create a public bucket for photo uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('photos', 'photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to photos bucket
CREATE POLICY "photos_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'photos' AND auth.role() = 'authenticated'
  );

-- Allow authenticated users to delete from photos bucket
CREATE POLICY "photos_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'photos' AND auth.role() = 'authenticated'
  );

-- Allow public read access to photos
CREATE POLICY "photos_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'photos');


-- ================================================================
-- BOOTSTRAP YOUR SUPER-ADMIN
-- ================================================================
-- After running this script:
--   1. Sign up via your app's Admin Login (or Supabase Auth dashboard)
--   2. Copy the new user's UUID from Supabase Auth → Users
--   3. Run this (replace YOUR-USER-UUID):
--
--   INSERT INTO public.admins (id, is_super) VALUES ('YOUR-USER-UUID', true);
--
-- That account becomes the super-admin and can create other admins.
-- ================================================================
