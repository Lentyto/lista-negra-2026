-- Inbox / Tip Line table
CREATE TABLE IF NOT EXISTS public.inbox (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message TEXT,
    image_url TEXT,
    cloudinary_public_id TEXT,
    cloudinary_resource_type TEXT DEFAULT 'image',
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Allow anyone to insert (anonymous tips)
ALTER TABLE public.inbox ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert inbox" ON public.inbox
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can select inbox" ON public.inbox
    FOR SELECT USING (true);

CREATE POLICY "Anyone can update inbox" ON public.inbox
    FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete inbox" ON public.inbox
    FOR DELETE USING (true);
