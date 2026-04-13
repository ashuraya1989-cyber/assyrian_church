-- =============================================================
-- FULLSTÄNDIGT SCHEMA — Kyrkoregistret Multi-Tenant
-- Raderar allt och bygger upp från grunden.
-- Kör HELA denna fil i Supabase SQL Editor.
-- =============================================================

-- -----------------------------------------------
-- 0. Rensa allt befintligt
-- -----------------------------------------------

-- Droppa triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Droppa funktioner
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
DROP FUNCTION IF EXISTS public.is_org_admin() CASCADE;
DROP FUNCTION IF EXISTS public.get_current_org_id() CASCADE;
DROP FUNCTION IF EXISTS public.set_current_org(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.log_audit_event(UUID, TEXT, TEXT, TEXT, TEXT, JSONB) CASCADE;
DROP FUNCTION IF EXISTS public.add_family_with_children(JSONB, JSONB) CASCADE;
DROP FUNCTION IF EXISTS public.update_family_with_children(UUID, JSONB, JSONB) CASCADE;

-- Droppa tabeller (i rätt ordning pga foreign keys)
DROP TABLE IF EXISTS public.email_receipts CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.betalningar CASCADE;
DROP TABLE IF EXISTS public.barn CASCADE;
DROP TABLE IF EXISTS public.familjer CASCADE;
DROP TABLE IF EXISTS public.intakter CASCADE;
DROP TABLE IF EXISTS public.utgifter CASCADE;
DROP TABLE IF EXISTS public.app_settings CASCADE;
DROP TABLE IF EXISTS public.organisation_members CASCADE;
DROP TABLE IF EXISTS public.organisations CASCADE;
DROP TABLE IF EXISTS public.user_profiles CASCADE;

-- Droppa enum
DROP TYPE IF EXISTS public.user_role CASCADE;

-- -----------------------------------------------
-- 1. Enum: user_role
-- -----------------------------------------------
CREATE TYPE public.user_role AS ENUM ('superadmin', 'admin', 'user');

-- -----------------------------------------------
-- 2. Tabell: user_profiles
-- -----------------------------------------------
CREATE TABLE public.user_profiles (
    id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email       TEXT,
    role        public.user_role DEFAULT 'user',
    permissions JSONB DEFAULT '[]'::jsonb,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------
-- 3. Tabell: organisations
-- -----------------------------------------------
CREATE TABLE public.organisations (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name          TEXT NOT NULL,
    slug          TEXT NOT NULL UNIQUE,
    logo_url      TEXT,
    primary_color TEXT DEFAULT '#C9A84C',
    is_active     BOOLEAN DEFAULT true,
    created_by    UUID REFERENCES auth.users(id),
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------
-- 4. Tabell: organisation_members
-- -----------------------------------------------
CREATE TABLE public.organisation_members (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role            public.user_role DEFAULT 'user',
    permissions     JSONB DEFAULT '[]',
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organisation_id, user_id)
);

CREATE INDEX org_members_user_idx ON public.organisation_members(user_id);
CREATE INDEX org_members_org_idx  ON public.organisation_members(organisation_id);

-- -----------------------------------------------
-- 5. Tabell: familjer
-- -----------------------------------------------
CREATE TABLE public.familjer (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id      UUID NOT NULL REFERENCES public.organisations(id),
    familje_namn         TEXT NOT NULL,
    make_namn            TEXT,
    make_personnummer    TEXT,
    make_manads_avgift   INTEGER DEFAULT 200,
    hustru_namn          TEXT,
    hustru_personnummer  TEXT,
    hustru_manads_avgift INTEGER DEFAULT 200,
    mobil_nummer         TEXT,
    mail                 TEXT,
    adress               TEXT,
    ort                  TEXT,
    post_kod             TEXT,
    land                 TEXT DEFAULT 'Sverige',
    created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------
-- 6. Tabell: barn
-- -----------------------------------------------
CREATE TABLE public.barn (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID REFERENCES public.organisations(id),
    familj_id       UUID REFERENCES public.familjer(id) ON DELETE CASCADE,
    ordning         INTEGER DEFAULT 1,
    namn            TEXT,
    personnummer    TEXT,
    manads_avgift   INTEGER DEFAULT 100,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------
-- 7. Tabell: betalningar
-- -----------------------------------------------
CREATE TABLE public.betalningar (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id      UUID NOT NULL REFERENCES public.organisations(id),
    familj_id            UUID REFERENCES public.familjer(id) ON DELETE CASCADE,
    total_manads_avgift  INTEGER DEFAULT 0,
    total_ars_avgift     INTEGER DEFAULT 0,
    summan               INTEGER DEFAULT 0,
    betalat_till_datum   DATE,
    betalat_via          TEXT DEFAULT 'Swish',
    betalnings_referens  TEXT,
    created_at           TIMESTAMPTZ DEFAULT NOW(),
    updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------
-- 8. Tabell: intakter
-- -----------------------------------------------
CREATE TABLE public.intakter (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES public.organisations(id),
    datum           DATE,
    manad           TEXT,
    vecka           INTEGER,
    medlems_avgift  INTEGER DEFAULT 0,
    gavor           INTEGER DEFAULT 0,
    ungdomar        INTEGER DEFAULT 0,
    annat           INTEGER DEFAULT 0,
    total           INTEGER DEFAULT 0,
    rapporterat_av  TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------
-- 9. Tabell: utgifter
-- -----------------------------------------------
CREATE TABLE public.utgifter (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES public.organisations(id),
    datum           DATE,
    manad           TEXT,
    vecka           INTEGER,
    hyra            INTEGER DEFAULT 0,
    frukost         INTEGER DEFAULT 0,
    rakning         INTEGER DEFAULT 0,
    annat           INTEGER DEFAULT 0,
    total           INTEGER DEFAULT 0,
    rapporterat_av  TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------
-- 10. Tabell: app_settings
-- -----------------------------------------------
CREATE TABLE public.app_settings (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id   UUID UNIQUE REFERENCES public.organisations(id),
    admin_logo_url    TEXT,
    login_logo_url    TEXT,
    admin_title       TEXT DEFAULT 'Medlemsregister',
    login_title       TEXT DEFAULT 'Välkommen',
    login_subtitle    TEXT DEFAULT 'Logga in på medlemsregistret',
    admin_logo_size   INTEGER DEFAULT 32,
    login_logo_size   INTEGER DEFAULT 64,
    resend_api_key    TEXT DEFAULT NULL,
    resend_from_email TEXT DEFAULT NULL,
    resend_from_name  TEXT DEFAULT 'Kyrkoregistret',
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------
-- 11. Tabell: audit_logs
-- -----------------------------------------------
CREATE TABLE public.audit_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID REFERENCES public.organisations(id),
    user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email      TEXT,
    action          TEXT NOT NULL,
    resource        TEXT,
    resource_id     TEXT,
    details         JSONB DEFAULT '{}',
    ip_address      TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX audit_logs_user_id_idx    ON public.audit_logs(user_id);
CREATE INDEX audit_logs_created_at_idx ON public.audit_logs(created_at DESC);
CREATE INDEX audit_logs_org_idx        ON public.audit_logs(organisation_id);

-- -----------------------------------------------
-- 12. Tabell: email_receipts
-- -----------------------------------------------
CREATE TABLE public.email_receipts (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    betalning_id      UUID REFERENCES public.betalningar(id) ON DELETE SET NULL,
    recipient_email   TEXT NOT NULL,
    recipient_name    TEXT,
    subject           TEXT,
    sent_at           TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    status            TEXT DEFAULT 'sent',
    resend_message_id TEXT
);

-- -----------------------------------------------
-- 13. Storage bucket
-- -----------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('public_assets', 'public_assets', true)
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------
-- 14. Hjälpfunktion: is_admin()
-- -----------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
DECLARE v_role public.user_role;
BEGIN
    SELECT role INTO v_role FROM public.user_profiles WHERE id = auth.uid();
    RETURN v_role IN ('admin', 'superadmin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- -----------------------------------------------
-- 15. RLS: Aktivera på alla tabeller
-- -----------------------------------------------
ALTER TABLE public.user_profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organisations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organisation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.familjer            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barn                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.betalningar         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intakter            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.utgifter            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_receipts      ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------
-- 16. RLS Policyer: user_profiles
-- -----------------------------------------------
CREATE POLICY "Users can view own profile"
    ON public.user_profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "Admins can view all profiles"
    ON public.user_profiles FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Admins can update profiles"
    ON public.user_profiles FOR UPDATE TO authenticated USING (public.is_admin());
CREATE POLICY "Service role can insert profiles"
    ON public.user_profiles FOR INSERT TO authenticated, service_role
    WITH CHECK (true);
CREATE POLICY "Admins can delete profiles"
    ON public.user_profiles FOR DELETE TO authenticated USING (public.is_admin());

-- -----------------------------------------------
-- 17. RLS Policyer: organisations
-- -----------------------------------------------
CREATE POLICY "Superadmins can manage organisations"
    ON public.organisations FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'superadmin'));
CREATE POLICY "Members can view own organisation"
    ON public.organisations FOR SELECT TO authenticated
    USING (id IN (SELECT organisation_id FROM public.organisation_members WHERE user_id = auth.uid()));

-- -----------------------------------------------
-- 18. RLS Policyer: organisation_members
-- -----------------------------------------------
CREATE POLICY "Superadmins can manage members"
    ON public.organisation_members FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'superadmin'));
CREATE POLICY "Users can view own memberships"
    ON public.organisation_members FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- -----------------------------------------------
-- 19. RLS Policyer: familjer (membership-baserad)
-- -----------------------------------------------
CREATE POLICY "Org members can read" ON public.familjer FOR SELECT TO authenticated
USING (organisation_id IN (SELECT organisation_id FROM public.organisation_members WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'superadmin'));
CREATE POLICY "Org members can insert" ON public.familjer FOR INSERT TO authenticated
WITH CHECK (organisation_id IN (SELECT organisation_id FROM public.organisation_members WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'superadmin'));
CREATE POLICY "Org members can update" ON public.familjer FOR UPDATE TO authenticated
USING (organisation_id IN (SELECT organisation_id FROM public.organisation_members WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'superadmin'));
CREATE POLICY "Org members can delete" ON public.familjer FOR DELETE TO authenticated
USING (organisation_id IN (SELECT organisation_id FROM public.organisation_members WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'superadmin'));

-- -----------------------------------------------
-- 20. RLS Policyer: barn
-- -----------------------------------------------
CREATE POLICY "Org members can read" ON public.barn FOR SELECT TO authenticated
USING (organisation_id IN (SELECT organisation_id FROM public.organisation_members WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'superadmin'));
CREATE POLICY "Org members can insert" ON public.barn FOR INSERT TO authenticated
WITH CHECK (organisation_id IN (SELECT organisation_id FROM public.organisation_members WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'superadmin'));
CREATE POLICY "Org members can update" ON public.barn FOR UPDATE TO authenticated
USING (organisation_id IN (SELECT organisation_id FROM public.organisation_members WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'superadmin'));
CREATE POLICY "Org members can delete" ON public.barn FOR DELETE TO authenticated
USING (organisation_id IN (SELECT organisation_id FROM public.organisation_members WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'superadmin'));

-- -----------------------------------------------
-- 21. RLS Policyer: betalningar
-- -----------------------------------------------
CREATE POLICY "Org members can read" ON public.betalningar FOR SELECT TO authenticated
USING (organisation_id IN (SELECT organisation_id FROM public.organisation_members WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'superadmin'));
CREATE POLICY "Org members can insert" ON public.betalningar FOR INSERT TO authenticated
WITH CHECK (organisation_id IN (SELECT organisation_id FROM public.organisation_members WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'superadmin'));
CREATE POLICY "Org members can update" ON public.betalningar FOR UPDATE TO authenticated
USING (organisation_id IN (SELECT organisation_id FROM public.organisation_members WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'superadmin'));
CREATE POLICY "Org members can delete" ON public.betalningar FOR DELETE TO authenticated
USING (organisation_id IN (SELECT organisation_id FROM public.organisation_members WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'superadmin'));

-- -----------------------------------------------
-- 22. RLS Policyer: intakter
-- -----------------------------------------------
CREATE POLICY "Org members can read" ON public.intakter FOR SELECT TO authenticated
USING (organisation_id IN (SELECT organisation_id FROM public.organisation_members WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'superadmin'));
CREATE POLICY "Org members can insert" ON public.intakter FOR INSERT TO authenticated
WITH CHECK (organisation_id IN (SELECT organisation_id FROM public.organisation_members WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'superadmin'));
CREATE POLICY "Org members can update" ON public.intakter FOR UPDATE TO authenticated
USING (organisation_id IN (SELECT organisation_id FROM public.organisation_members WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'superadmin'));
CREATE POLICY "Org members can delete" ON public.intakter FOR DELETE TO authenticated
USING (organisation_id IN (SELECT organisation_id FROM public.organisation_members WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'superadmin'));

-- -----------------------------------------------
-- 23. RLS Policyer: utgifter
-- -----------------------------------------------
CREATE POLICY "Org members can read" ON public.utgifter FOR SELECT TO authenticated
USING (organisation_id IN (SELECT organisation_id FROM public.organisation_members WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'superadmin'));
CREATE POLICY "Org members can insert" ON public.utgifter FOR INSERT TO authenticated
WITH CHECK (organisation_id IN (SELECT organisation_id FROM public.organisation_members WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'superadmin'));
CREATE POLICY "Org members can update" ON public.utgifter FOR UPDATE TO authenticated
USING (organisation_id IN (SELECT organisation_id FROM public.organisation_members WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'superadmin'));
CREATE POLICY "Org members can delete" ON public.utgifter FOR DELETE TO authenticated
USING (organisation_id IN (SELECT organisation_id FROM public.organisation_members WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'superadmin'));

-- -----------------------------------------------
-- 24. RLS Policyer: app_settings
-- -----------------------------------------------
CREATE POLICY "Public can read settings"
    ON public.app_settings FOR SELECT TO public USING (true);
CREATE POLICY "Org members can update settings"
    ON public.app_settings FOR UPDATE TO authenticated
    USING (organisation_id IN (SELECT organisation_id FROM public.organisation_members WHERE user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'superadmin'));
CREATE POLICY "Org members can insert settings"
    ON public.app_settings FOR INSERT TO authenticated, service_role
    WITH CHECK (true);

-- -----------------------------------------------
-- 25. RLS Policyer: audit_logs
-- -----------------------------------------------
CREATE POLICY "Admins can view audit logs"
    ON public.audit_logs FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Users can insert audit logs"
    ON public.audit_logs FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- -----------------------------------------------
-- 26. RLS Policyer: email_receipts
-- -----------------------------------------------
CREATE POLICY "Admins can manage email receipts"
    ON public.email_receipts FOR ALL TO authenticated USING (public.is_admin());

-- -----------------------------------------------
-- 27. Storage policyer
-- -----------------------------------------------
CREATE POLICY "Public Read Access"
    ON storage.objects FOR SELECT USING (bucket_id = 'public_assets');
CREATE POLICY "Authenticated users can upload"
    ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'public_assets');
CREATE POLICY "Authenticated users can update"
    ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'public_assets');
CREATE POLICY "Authenticated users can delete"
    ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'public_assets');

-- -----------------------------------------------
-- 28. RPC: add_family_with_children
-- -----------------------------------------------
CREATE OR REPLACE FUNCTION public.add_family_with_children(
    family_data   JSONB,
    children_data JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_family_id UUID;
    child_data    JSONB;
    v_org_id      UUID;
BEGIN
    v_org_id := (family_data->>'organisation_id')::UUID;

    INSERT INTO familjer (
        organisation_id, familje_namn,
        make_namn, make_personnummer, make_manads_avgift,
        hustru_namn, hustru_personnummer, hustru_manads_avgift,
        mobil_nummer, mail, adress, ort, post_kod, land
    ) VALUES (
        v_org_id,
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
                INSERT INTO barn (organisation_id, familj_id, ordning, namn, personnummer, manads_avgift)
                VALUES (
                    v_org_id,
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
-- 29. RPC: update_family_with_children
-- -----------------------------------------------
CREATE OR REPLACE FUNCTION public.update_family_with_children(
    p_family_id   UUID,
    family_data   JSONB,
    children_data JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    child_data JSONB;
    v_org_id   UUID;
BEGIN
    SELECT organisation_id INTO v_org_id FROM familjer WHERE id = p_family_id;
    IF v_org_id IS NULL THEN
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
                INSERT INTO barn (organisation_id, familj_id, ordning, namn, personnummer, manads_avgift)
                VALUES (
                    v_org_id,
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
-- 30. RPC: log_audit_event
-- -----------------------------------------------
CREATE OR REPLACE FUNCTION public.log_audit_event(
    p_user_id     UUID,
    p_user_email  TEXT,
    p_action      TEXT,
    p_resource    TEXT    DEFAULT NULL,
    p_resource_id TEXT    DEFAULT NULL,
    p_details     JSONB   DEFAULT '{}'
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
-- 31. Trigger: skapa user_profile vid registrering
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

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- -----------------------------------------------
-- 32. Synka befintliga auth-användare → user_profiles
-- -----------------------------------------------
DO $$
DECLARE
    u         RECORD;
    is_first  BOOLEAN := true;
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
-- KLART — Databasen är helt återställd och konfigurerad.
-- Skapa nu din organisation via Super Admin-panelen i appen.
-- =============================================================
