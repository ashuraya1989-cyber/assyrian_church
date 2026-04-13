-- =============================================================
-- Migration: Bug fixes, security hardening & new features
-- =============================================================

-- -----------------------------------------------
-- FIX CRIT-2: Restrict app_settings UPDATE to admins only
-- -----------------------------------------------
DROP POLICY IF EXISTS "Allow authenticated update access to settings" ON public.app_settings;

CREATE POLICY "Only admins can update settings"
ON public.app_settings FOR UPDATE TO authenticated
USING (public.is_admin()) WITH CHECK (public.is_admin());

-- -----------------------------------------------
-- FIX HIGH-5: update_family_with_children — add row existence check
-- Keep the existing JSONB-based signature (family_data JSONB, children_data JSONB)
-- -----------------------------------------------
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
    v_exists   BOOLEAN;
BEGIN
    -- Check family exists (HIGH-5 fix)
    SELECT EXISTS(SELECT 1 FROM familjer WHERE id = p_family_id) INTO v_exists;
    IF NOT v_exists THEN
        RAISE EXCEPTION 'Family with id % not found', p_family_id;
    END IF;

    UPDATE familjer SET
        familje_namn          = family_data->>'familje_namn',
        make_namn             = family_data->>'make_namn',
        make_personnummer     = NULLIF(family_data->>'make_personnummer', ''),
        make_manads_avgift    = COALESCE((family_data->>'make_manads_avgift')::INTEGER, 200),
        hustru_namn           = family_data->>'hustru_namn',
        hustru_personnummer   = NULLIF(family_data->>'hustru_personnummer', ''),
        hustru_manads_avgift  = COALESCE((family_data->>'hustru_manads_avgift')::INTEGER, 200),
        mobil_nummer          = family_data->>'mobil_nummer',
        mail                  = family_data->>'mail',
        adress                = family_data->>'adress',
        ort                   = family_data->>'ort',
        post_kod              = family_data->>'post_kod',
        land                  = COALESCE(family_data->>'land', 'Sverige')
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
-- NEW: Resend API key in app_settings
-- -----------------------------------------------
ALTER TABLE public.app_settings
    ADD COLUMN IF NOT EXISTS resend_api_key TEXT DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS resend_from_email TEXT DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS resend_from_name TEXT DEFAULT 'Kyrkoregistret';

-- -----------------------------------------------
-- NEW: Audit logs table
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email TEXT,
    action TEXT NOT NULL,          -- 'login', 'logout', 'create', 'update', 'delete', 'export', 'email_sent'
    resource TEXT,                 -- 'family', 'payment', 'user', 'settings', etc.
    resource_id TEXT,
    details JSONB DEFAULT '{}',
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS audit_logs_user_id_idx ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_action_idx ON public.audit_logs(action);

-- RLS for audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins/superadmins can view logs
CREATE POLICY "Admins can view audit logs"
ON public.audit_logs FOR SELECT TO authenticated
USING (public.is_admin());

-- Any authenticated user can insert their own log entries
CREATE POLICY "Users can insert own audit logs"
ON public.audit_logs FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- -----------------------------------------------
-- NEW: Function to log audit events
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
-- NEW: Email receipts table
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

ALTER TABLE public.email_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage email receipts"
ON public.email_receipts FOR ALL TO authenticated
USING (public.is_admin());
