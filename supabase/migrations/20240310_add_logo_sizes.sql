-- Add logo size columns to app_settings
ALTER TABLE public.app_settings
ADD COLUMN IF NOT EXISTS admin_logo_size INTEGER DEFAULT 32,
ADD COLUMN IF NOT EXISTS login_logo_size INTEGER DEFAULT 64;

-- Create public_assets bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('public_assets', 'public_assets', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist (to avoid errors on re-run)
DO $$
BEGIN
    -- Only drop Storage policies for our bucket to avoid touching other policies accidentally
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public Read Access') THEN
        DROP POLICY "Public Read Access" on storage.objects;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated users can upload') THEN
        DROP POLICY "Authenticated users can upload" on storage.objects;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated users can update') THEN
        DROP POLICY "Authenticated users can update" on storage.objects;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated users can delete') THEN
        DROP POLICY "Authenticated users can delete" on storage.objects;
    END IF;
    
    -- Drop the app_settings policies just in case the user re-ran the *previous* script by mistake
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'app_settings' AND policyname = 'Allow public read access to settings') THEN
        DROP POLICY "Allow public read access to settings" on public.app_settings;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'app_settings' AND policyname = 'Allow authenticated update access to settings') THEN
        DROP POLICY "Allow authenticated update access to settings" on public.app_settings;
    END IF;
END $$;

-- Re-create app_settings Policies
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to settings" ON public.app_settings FOR SELECT TO public USING (true);
CREATE POLICY "Allow authenticated update access to settings" ON public.app_settings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Storage Policies for public_assets bucket
-- Allow public read access
CREATE POLICY "Public Read Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'public_assets');

-- Allow authenticated users to upload/update/delete
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'public_assets');

CREATE POLICY "Authenticated users can update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'public_assets');

CREATE POLICY "Authenticated users can delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'public_assets');
