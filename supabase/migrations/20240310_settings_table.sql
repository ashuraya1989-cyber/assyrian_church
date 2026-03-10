-- Create app_settings table
CREATE TABLE IF NOT EXISTS public.app_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1), -- Only allow one row
    admin_logo_url TEXT,
    login_logo_url TEXT,
    admin_title TEXT DEFAULT 'Medlemsregister',
    login_title TEXT DEFAULT 'Välkommen',
    login_subtitle TEXT DEFAULT 'Logga in på medlemsregistret',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default row if it doesn't exist
INSERT INTO public.app_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- Set up Row Level Security
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Allow read access to anyone (needed for login page before auth)
CREATE POLICY "Allow public read access to settings"
ON public.app_settings FOR SELECT
TO public
USING (true);

-- Allow update access to authenticated users
CREATE POLICY "Allow authenticated update access to settings"
ON public.app_settings FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);
