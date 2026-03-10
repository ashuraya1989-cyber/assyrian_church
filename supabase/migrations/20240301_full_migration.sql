-- 1. Bytt namn på födelsedatum-kolumnerna till personnummer
ALTER TABLE familjer RENAME COLUMN make_fodelse_datum TO make_personnummer;
ALTER TABLE familjer RENAME COLUMN hustru_fodelse_datum TO hustru_personnummer;
ALTER TABLE barn RENAME COLUMN fodelse_datum TO personnummer;

-- 2. Ändra datatyp från DATE till TEXT för att tillåta 12 siffror (ÅÅÅÅMMDDNNNN)
ALTER TABLE familjer ALTER COLUMN make_personnummer TYPE TEXT;
ALTER TABLE familjer ALTER COLUMN hustru_personnummer TYPE TEXT;
ALTER TABLE barn ALTER COLUMN personnummer TYPE TEXT;

-- 3. Lägg till den nya kolumnen för "Land"
ALTER TABLE familjer ADD COLUMN IF NOT EXISTS land TEXT DEFAULT 'Sverige';

-- 4. Rensa gamla versioner av funktionerna (för att undvika konflikter)
DROP FUNCTION IF EXISTS add_family_with_children(JSONB, JSONB[]);
DROP FUNCTION IF EXISTS add_family_with_children(JSONB, JSONB);
DROP FUNCTION IF EXISTS update_family_with_children(UUID, JSONB, JSONB);

-- 5. Skapa den uppdaterade LÄGG TILL-funktionen (med personnummer och land)
CREATE OR REPLACE FUNCTION add_family_with_children(
  family_data JSONB,
  children_data JSONB
) RETURNS UUID AS $$
DECLARE
  new_family_id UUID;
  child_data JSONB;
BEGIN
  -- Lägg in familjen
  INSERT INTO familjer (
    familje_namn, make_namn, make_personnummer, make_manads_avgift,
    hustru_namn, hustru_personnummer, hustru_manads_avgift,
    mobil_nummer, mail, adress, ort, post_kod, land
  ) VALUES (
    family_data->>'familje_namn',
    family_data->>'make_namn',
    NULLIF(family_data->>'make_personnummer', ''),
    COALESCE((family_data->>'make_manads_avgift')::INTEGER, 200),
    family_data->>'hustru_namn',
    NULLIF(family_data->>'hustru_personnummer', ''),
    COALESCE((family_data->>'hustru_manads_avgift')::INTEGER, 200),
    family_data->>'mobil_nummer',
    family_data->>'mail',
    family_data->>'adress',
    family_data->>'ort',
    family_data->>'post_kod',
    COALESCE(family_data->>'land', 'Sverige')
  ) RETURNING id INTO new_family_id;

  -- Lägg in barn
  IF children_data IS NOT NULL AND jsonb_typeof(children_data) = 'array' THEN
    FOR child_data IN SELECT * FROM jsonb_array_elements(children_data)
    LOOP
      IF child_data->>'namn' IS NOT NULL AND child_data->>'namn' != '' THEN
        INSERT INTO barn (familj_id, ordning, namn, personnummer, manads_avgift)
        VALUES (
          new_family_id,
          COALESCE((child_data->>'ordning')::INTEGER, 1),
          child_data->>'namn',
          NULLIF(child_data->>'personnummer', ''),
          COALESCE((child_data->>'manads_avgift')::INTEGER, 100)
        );
      END IF;
    END LOOP;
  END IF;

  RETURN new_family_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 6. Skapa den uppdaterade REDIGERA-funktionen (med personnummer och land)
CREATE OR REPLACE FUNCTION update_family_with_children(
  p_family_id UUID,
  family_data JSONB,
  children_data JSONB
) RETURNS VOID AS $$
DECLARE
  child_data JSONB;
BEGIN
  -- Uppdatera familjens data
  UPDATE familjer SET
    familje_namn = family_data->>'familje_namn',
    make_namn = family_data->>'make_namn',
    make_personnummer = NULLIF(family_data->>'make_personnummer', ''),
    make_manads_avgift = COALESCE((family_data->>'make_manads_avgift')::INTEGER, 200),
    hustru_namn = family_data->>'hustru_namn',
    hustru_personnummer = NULLIF(family_data->>'hustru_personnummer', ''),
    hustru_manads_avgift = COALESCE((family_data->>'hustru_manads_avgift')::INTEGER, 200),
    mobil_nummer = family_data->>'mobil_nummer',
    mail = family_data->>'mail',
    adress = family_data->>'adress',
    ort = family_data->>'ort',
    post_kod = family_data->>'post_kod',
    land = COALESCE(family_data->>'land', 'Sverige')
  WHERE id = p_family_id;

  -- Ta bort gamla barn
  DELETE FROM barn WHERE familj_id = p_family_id;

  -- Sätt in uppdaterade barn
  IF children_data IS NOT NULL AND jsonb_typeof(children_data) = 'array' THEN
    FOR child_data IN SELECT * FROM jsonb_array_elements(children_data)
    LOOP
      IF child_data->>'namn' IS NOT NULL AND child_data->>'namn' != '' THEN
        INSERT INTO barn (familj_id, ordning, namn, personnummer, manads_avgift)
        VALUES (
          p_family_id,
          COALESCE((child_data->>'ordning')::INTEGER, 1),
          child_data->>'namn',
          NULLIF(child_data->>'personnummer', ''),
          COALESCE((child_data->>'manads_avgift')::INTEGER, 100)
        );
      END IF;
    END LOOP;
  END IF;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

-- Insert default row
INSERT INTO public.app_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.app_settings
ADD COLUMN IF NOT EXISTS admin_logo_size INTEGER DEFAULT 32,
ADD COLUMN IF NOT EXISTS login_logo_size INTEGER DEFAULT 64;
-- Skapa public_assets bucket om den inte finns
INSERT INTO storage.buckets (id, name, public)
VALUES ('public_assets', 'public_assets', true)
ON CONFLICT (id) DO NOTHING;
-- Ta bort befintliga säkerhetsregler (policies) för att undvika konflikter
DO $$
BEGIN
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
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'app_settings' AND policyname = 'Allow public read access to settings') THEN
        DROP POLICY "Allow public read access to settings" on public.app_settings;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'app_settings' AND policyname = 'Allow authenticated update access to settings') THEN
        DROP POLICY "Allow authenticated update access to settings" on public.app_settings;
    END IF;
END $$;
-- Kör om app_settings regler
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to settings" ON public.app_settings FOR SELECT TO public USING (true);
CREATE POLICY "Allow authenticated update access to settings" ON public.app_settings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
-- Skapa lagringsregler (Storage Policies) för public_assets
CREATE POLICY "Public Read Access" ON storage.objects FOR SELECT USING (bucket_id = 'public_assets');
CREATE POLICY "Authenticated users can upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'public_assets');
CREATE POLICY "Authenticated users can update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'public_assets');
CREATE POLICY "Authenticated users can delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'public_assets');

-- Create an enum for user roles
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('superadmin', 'admin', 'user');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create the user_profiles table
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    role user_role DEFAULT 'user',
    permissions JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop early versions in case they exist:
DO $$
BEGIN
    DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;
    DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
    DROP POLICY IF EXISTS "Admins can update profiles" ON public.user_profiles;
    DROP POLICY IF EXISTS "Admins can insert profiles" ON public.user_profiles;
    DROP POLICY IF EXISTS "Admins can delete profiles" ON public.user_profiles;
END $$;

-- 1. Admins and Superadmins can read all profiles
CREATE POLICY "Admins can view all profiles" 
ON public.user_profiles FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND (up.role = 'superadmin' OR up.role = 'admin')));

-- 2. ALL users can view their own profile
CREATE POLICY "Users can view own profile" 
ON public.user_profiles FOR SELECT TO authenticated USING (id = auth.uid());

-- 3. Admins and Superadmins can update profiles
CREATE POLICY "Admins can update profiles" 
ON public.user_profiles FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND (up.role = 'superadmin' OR up.role = 'admin')));

-- 4. Admins and Superadmins can insert profiles
CREATE POLICY "Admins can insert profiles" 
ON public.user_profiles FOR INSERT TO authenticated, service_role
WITH CHECK (
    current_user = 'service_role' OR
    EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND (up.role = 'superadmin' OR up.role = 'admin')
));

-- 5. Admins and Superadmins can delete profiles
CREATE POLICY "Admins can delete profiles" 
ON public.user_profiles FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND (up.role = 'superadmin' OR up.role = 'admin')));

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    is_first_user BOOLEAN;
BEGIN
    SELECT NOT EXISTS (SELECT 1 FROM public.user_profiles) INTO is_first_user;
    INSERT INTO public.user_profiles (id, email, role, permissions)
    VALUES (
        NEW.id, NEW.email,
        CASE WHEN is_first_user THEN 'superadmin'::user_role ELSE 'user'::user_role END,
        CASE WHEN is_first_user THEN '["register", "payments", "income", "expenses", "stats", "settings", "users"]'::jsonb ELSE '[]'::jsonb END
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Manually sync any existing users that don't have a profile yet
DO $$
DECLARE
    user_record RECORD;
    is_first BOOLEAN := true;
BEGIN
    FOR user_record IN SELECT id, email FROM auth.users WHERE id NOT IN (SELECT id FROM public.user_profiles)
    LOOP
        INSERT INTO public.user_profiles (id, email, role, permissions)
        VALUES (
            user_record.id, user_record.email, 
            CASE WHEN is_first THEN 'superadmin'::user_role ELSE 'user'::user_role END,
            CASE WHEN is_first THEN '["register", "payments", "income", "expenses", "stats", "settings", "users"]'::jsonb ELSE '[]'::jsonb END
        );
        is_first := false;
    END LOOP;
END;
$$;
