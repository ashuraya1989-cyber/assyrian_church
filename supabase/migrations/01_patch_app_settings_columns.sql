-- =============================================================
-- PATCH: Lägg till saknade kolumner i app_settings
-- Kör denna i Supabase SQL-editorn om du får fel om saknade kolumner.
-- Alla steg är idempotenta (säkert att köra flera gånger).
-- =============================================================

-- Resend-kolumner
ALTER TABLE public.app_settings
    ADD COLUMN IF NOT EXISTS resend_api_key    TEXT DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS resend_from_email TEXT DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS resend_from_name  TEXT DEFAULT 'Kyrkoregistret';

-- Logo-storlek kolumner (om de saknas)
ALTER TABLE public.app_settings
    ADD COLUMN IF NOT EXISTS admin_logo_size INTEGER DEFAULT 32,
    ADD COLUMN IF NOT EXISTS login_logo_size INTEGER DEFAULT 64;

-- Bekräfta att raden finns
INSERT INTO public.app_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Verifiera att allt är på plats
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'app_settings'
ORDER BY ordinal_position;
