-- =============================================================
-- FULL SCHEMA — Kyrkoregistret
-- Kör denna fil i Supabase SQL-editorn för att sätta upp allt.
-- Alla steg är idempotenta (säkert att köra flera gånger).
-- =============================================================

-- -----------------------------------------------
-- 1. Tabeller: familjer, barn
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.familjer (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    familje_namn TEXT NOT NULL,
    make_namn TEXT,
    make_personnummer TEXT,
    make_manads_avgift INTEGER DEFAULT 200,
    hustru_namn TEXT,
    hustru_personnummer TEXT,
    hustru_manads_avgift INTEGER DEFAULT 200,
    mobil_nummer TEXT,
    mail TEXT,
    adress TEXT,
    ort TEXT,
    post_kod TEXT,
    land TEXT DEFAULT 'Sverige',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.barn (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    familj_id UUID REFERENCES public.familjer(id) ON DELETE CASCADE,
    ordning INTEGER DEFAULT 1,
    namn TEXT,
    personnummer TEXT,
    manads_avgift INTEGER DEFAULT 100,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Byt namn på gamla kolumner om de fortfarande heter fodelse_datum
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='familjer' AND column_name='make_fodelse_datum') THEN
        ALTER TABLE familjer RENAME COLUMN make_fodelse_datum TO make_personnummer;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='familjer' AND column_name='hustru_fodelse_datum') THEN
        ALTER TABLE familjer RENAME COLUMN hustru_fodelse_datum TO hustru_personnummer;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='barn' AND column_name='fodelse_datum') THEN
        ALTER TABLE barn RENAME COLUMN fodelse_datum TO personnummer;
    END IF;
END $$;

-- Säkerställ TEXT-typ och land-kolumn
ALTER TABLE familjer ALTER COLUMN make_personnummer TYPE TEXT;
ALTER TABLE familjer ALTER COLUMN hustru_personnummer TYPE TEXT;
ALTER TABLE barn     ALTER COLUMN personnummer TYPE TEXT;
ALTER TABLE familjer ADD COLUMN IF NOT EXISTS land TEXT DEFAULT 'Sverige';

-- -----------------------------------------------
-- 2. Tabeller: betalningar, intakter, utgifter
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.betalningar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    familj_id UUID REFERENCES public.familjer(id) ON DELETE CASCADE,
    belopp INTEGER NOT NULL,
    manad TEXT,
    ar INTEGER,
    betalt_datum DATE,
    anteckning TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.intakter (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    datum DATE,
    manad TEXT,
    vecka INTEGER,
    medlems_avgift INTEGER DEFAULT 0,
    gavor INTEGER DEFAULT 0,
    ungdomar INTEGER DEFAULT 0,
    annat INTEGER DEFAULT 0,
    total INTEGER DEFAULT 0,
    rapporterat_av TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.utgifter (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    datum DATE,
    manad TEXT,
    kategori TEXT,
    beskrivning TEXT,
    belopp INTEGER DEFAULT 0,
    total INTEGER DEFAULT 0,
    rapporterat_av TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------
-- 3. app_settings
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    admin_logo_url TEXT,
    login_logo_url TEXT,
    admin_title TEXT DEFAULT 'Medlemsregister',
    login_title TEXT DEFAULT 'Välkommen',
    login_subtitle TEXT DEFAULT 'Logga in på medlemsregistret',
    admin_logo_size INTEGER DEFAULT 32,
    login_logo_size INTEGER DEFAULT 64,
    resend_api_key TEXT DEFAULT NULL,
    resend_from_email TEXT DEFAULT NULL,
    resend_from_name TEXT DEFAULT 'Kyrkoregistret',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.app_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------
-- 4. audit_logs
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email TEXT,
    action TEXT NOT NULL,
    resource TEXT,
    resource_id TEXT,
    details JSONB DEFAULT '{}',
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS audit_logs_user_id_idx    ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_action_idx     ON public.audit_logs(action);

-- -----------------------------------------------
-- 5. email_receipts
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.email_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    betalning_id UUID REFERENCES public.betalningar(id) ON DELETE SET NULL,
    recipient_email TEXT NOT NULL,
    recipient_name TEXT,
    subject TEXT,
    sent_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    status TEXT DEFAULT 'sent',
    resend_message_id TEXT
);

-- -----------------------------------------------
-- 6. Storage: public_assets bucket
-- -----------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('public_assets', 'public_assets', true)
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------
-- 7. Roller: user_role enum + user_profiles
-- -----------------------------------------------
DO $$ BEGIN
    CREATE TYPE public.user_role AS ENUM ('superadmin', 'admin', 'user');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    role public.user_role DEFAULT 'user',
    permissions JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------
-- 8. Hjälpfunktion: is_admin()
-- -----------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
DECLARE
    v_role public.user_role;
BEGIN
    SELECT role INTO v_role FROM public.user_profiles WHERE id = auth.uid();
    RETURN v_role IN ('admin', 'superadmin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- -----------------------------------------------
-- 9. RLS: aktivera + policyer
-- -----------------------------------------------

-- familjer
ALTER TABLE public.familjer   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barn       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.betalningar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intakter   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.utgifter   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles  ENABLE ROW LEVEL SECURITY;

-- Ta bort gamla policyer (idempotent)
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname, tablename, schemaname
        FROM pg_policies
        WHERE schemaname IN ('public', 'storage')
        AND policyname IN (
            'Allow public read access to settings',
            'Allow authenticated update access to settings',
            'Admins can insert settings',
            'Admins can upsert settings',
            'Only admins can update settings',
            'Admins can view all profiles',
            'Users can view own profile',
            'Admins can update profiles',
            'Admins can insert profiles',
            'Admins can delete profiles',
            'Admins can view audit logs',
            'Users can insert own audit logs',
            'Admins can manage email receipts',
            'Public Read Access',
            'Authenticated users can upload',
            'Authenticated users can update',
            'Authenticated users can delete',
            'Allow all authenticated',
            'Allow authenticated read',
            'Allow authenticated insert',
            'Allow authenticated update',
            'Allow authenticated delete'
        )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
            pol.policyname, pol.schemaname, pol.tablename);
    END LOOP;
END $$;

-- app_settings policyer
CREATE POLICY "Allow public read access to settings"
    ON public.app_settings FOR SELECT TO public USING (true);
CREATE POLICY "Only admins can update settings"
    ON public.app_settings FOR UPDATE TO authenticated
    USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can insert settings"
    ON public.app_settings FOR INSERT TO authenticated
    WITH CHECK (public.is_admin());

-- user_profiles policyer
CREATE POLICY "Users can view own profile"
    ON public.user_profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "Admins can view all profiles"
    ON public.user_profiles FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Admins can update profiles"
    ON public.user_profiles FOR UPDATE TO authenticated USING (public.is_admin());
CREATE POLICY "Admins can insert profiles"
    ON public.user_profiles FOR INSERT TO authenticated, service_role
    WITH CHECK (current_user = 'service_role' OR public.is_admin());
CREATE POLICY "Admins can delete profiles"
    ON public.user_profiles FOR DELETE TO authenticated USING (public.is_admin());

-- audit_logs policyer
CREATE POLICY "Admins can view audit logs"
    ON public.audit_logs FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Users can insert own audit logs"
    ON public.audit_logs FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- email_receipts policyer
CREATE POLICY "Admins can manage email receipts"
    ON public.email_receipts FOR ALL TO authenticated USING (public.is_admin());

-- familjer / barn / betalningar / intakter / utgifter — autentiserade användare
CREATE POLICY "Allow authenticated read"    ON public.familjer    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert"  ON public.familjer    FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update"  ON public.familjer    FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete"  ON public.familjer    FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated read"    ON public.barn        FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert"  ON public.barn        FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update"  ON public.barn        FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete"  ON public.barn        FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated read"    ON public.betalningar FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert"  ON public.betalningar FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update"  ON public.betalningar FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete"  ON public.betalningar FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated read"    ON public.intakter    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert"  ON public.intakter    FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update"  ON public.intakter    FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete"  ON public.intakter    FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated read"    ON public.utgifter    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert"  ON public.utgifter    FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update"  ON public.utgifter    FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete"  ON public.utgifter    FOR DELETE TO authenticated USING (true);

-- Storage policyer
CREATE POLICY "Public Read Access"
    ON storage.objects FOR SELECT USING (bucket_id = 'public_assets');
CREATE POLICY "Authenticated users can upload"
    ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'public_assets');
CREATE POLICY "Authenticated users can update"
    ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'public_assets');
CREATE POLICY "Authenticated users can delete"
    ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'public_assets');

-- -----------------------------------------------
-- 10. RPC: add_family_with_children
-- -----------------------------------------------
DROP FUNCTION IF EXISTS add_family_with_children(JSONB, JSONB[]);
DROP FUNCTION IF EXISTS add_family_with_children(JSONB, JSONB);

CREATE OR REPLACE FUNCTION public.add_family_with_children(
    family_data JSONB,
    children_data JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_family_id UUID;
    child_data JSONB;
BEGIN
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
$$;

-- -----------------------------------------------
-- 11. RPC: update_family_with_children (med HIGH-5 fix)
-- -----------------------------------------------
DROP FUNCTION IF EXISTS update_family_with_children(UUID, JSONB, JSONB);

CREATE OR REPLACE FUNCTION public.update_family_with_children(
    p_family_id UUID,
    family_data JSONB,
    children_data JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    child_data JSONB;
    v_exists BOOLEAN;
BEGIN
    SELECT EXISTS(SELECT 1 FROM familjer WHERE id = p_family_id) INTO v_exists;
    IF NOT v_exists THEN
        RAISE EXCEPTION 'Family with id % not found', p_family_id;
    END IF;

    UPDATE familjer SET
        familje_namn         = family_data->>'familje_namn',
        make_namn            = family_data->>'make_namn',
        make_personnummer    = NULLIF(family_data->>'make_personnummer', ''),
        make_manads_avgift   = COALESCE((family_data->>'make_manads_avgift')::INTEGER, 200),
        hustru_namn          = family_data->>'hustru_namn',
        hustru_personnummer  = NULLIF(family_data->>'hustru_personnummer', ''),
        hustru_manads_avgift = COALESCE((family_data->>'hustru_manads_avgift')::INTEGER, 200),
        mobil_nummer         = family_data->>'mobil_nummer',
        mail                 = family_data->>'mail',
        adress               = family_data->>'adress',
        ort                  = family_data->>'ort',
        post_kod             = family_data->>'post_kod',
        land                 = COALESCE(family_data->>'land', 'Sverige')
    WHERE id = p_family_id;

    DELETE FROM barn WHERE familj_id = p_family_id;

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
$$;

-- -----------------------------------------------
-- 12. RPC: log_audit_event
-- -----------------------------------------------
CREATE OR REPLACE FUNCTION public.log_audit_event(
    p_user_id UUID,
    p_user_email TEXT,
    p_action TEXT,
    p_resource TEXT DEFAULT NULL,
    p_resource_id TEXT DEFAULT NULL,
    p_details JSONB DEFAULT '{}'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.audit_logs (user_id, user_email, action, resource, resource_id, details)
    VALUES (p_user_id, p_user_email, p_action, p_resource, p_resource_id, p_details);
END;
$$;

-- -----------------------------------------------
-- 13. Trigger: skapa user_profile vid ny registrering
-- -----------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    is_first_user BOOLEAN;
BEGIN
    SELECT NOT EXISTS (SELECT 1 FROM public.user_profiles) INTO is_first_user;
    INSERT INTO public.user_profiles (id, email, role, permissions)
    VALUES (
        NEW.id,
        NEW.email,
        CASE WHEN is_first_user THEN 'superadmin'::public.user_role ELSE 'user'::public.user_role END,
        CASE WHEN is_first_user
            THEN '["register","payments","income","expenses","stats","settings","users"]'::jsonb
            ELSE '[]'::jsonb
        END
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Synka befintliga användare utan profil
DO $$
DECLARE
    u RECORD;
    is_first BOOLEAN := true;
BEGIN
    FOR u IN
        SELECT id, email FROM auth.users
        WHERE id NOT IN (SELECT id FROM public.user_profiles)
        ORDER BY created_at
    LOOP
        INSERT INTO public.user_profiles (id, email, role, permissions)
        VALUES (
            u.id, u.email,
            CASE WHEN is_first THEN 'superadmin'::public.user_role ELSE 'user'::public.user_role END,
            CASE WHEN is_first
                THEN '["register","payments","income","expenses","stats","settings","users"]'::jsonb
                ELSE '[]'::jsonb
            END
        )
        ON CONFLICT (id) DO NOTHING;
        is_first := false;
    END LOOP;
END;
$$;

-- =============================================================
-- KLART — Databasen är fullt konfigurerad.
-- =============================================================
