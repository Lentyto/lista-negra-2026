-- Add Case Files columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS height TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS remarks TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS extra_photo_1 TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS extra_photo_2 TEXT;
