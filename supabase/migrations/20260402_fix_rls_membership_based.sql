-- =============================================================
-- FIX: RLS policies based on org MEMBERSHIP instead of session variable
-- Session variables don't work with Supabase REST API (stateless).
-- These policies check if the user is a member of the org directly.
-- =============================================================

-- Drop old org-based policies
DO $$
DECLARE pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname, tablename
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename IN ('familjer','barn','betalningar','intakter','utgifter')
        AND policyname IN (
            'Org members can read','Org members can insert',
            'Org members can update','Org members can delete'
        )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- ── familjer ──
CREATE POLICY "Org members can read" ON public.familjer FOR SELECT TO authenticated
USING (
    organisation_id IN (SELECT organisation_id FROM public.organisation_members WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'superadmin')
);
CREATE POLICY "Org members can insert" ON public.familjer FOR INSERT TO authenticated
WITH CHECK (
    organisation_id IN (SELECT organisation_id FROM public.organisation_members WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'superadmin')
);
CREATE POLICY "Org members can update" ON public.familjer FOR UPDATE TO authenticated
USING (
    organisation_id IN (SELECT organisation_id FROM public.organisation_members WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'superadmin')
);
CREATE POLICY "Org members can delete" ON public.familjer FOR DELETE TO authenticated
USING (
    organisation_id IN (SELECT organisation_id FROM public.organisation_members WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'superadmin')
);

-- ── barn ──
CREATE POLICY "Org members can read" ON public.barn FOR SELECT TO authenticated
USING (
    organisation_id IN (SELECT organisation_id FROM public.organisation_members WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'superadmin')
);
CREATE POLICY "Org members can insert" ON public.barn FOR INSERT TO authenticated
WITH CHECK (
    organisation_id IN (SELECT organisation_id FROM public.organisation_members WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'superadmin')
);
CREATE POLICY "Org members can update" ON public.barn FOR UPDATE TO authenticated
USING (
    organisation_id IN (SELECT organisation_id FROM public.organisation_members WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'superadmin')
);
CREATE POLICY "Org members can delete" ON public.barn FOR DELETE TO authenticated
USING (
    organisation_id IN (SELECT organisation_id FROM public.organisation_members WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'superadmin')
);

-- ── betalningar ──
CREATE POLICY "Org members can read" ON public.betalningar FOR SELECT TO authenticated
USING (
    organisation_id IN (SELECT organisation_id FROM public.organisation_members WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'superadmin')
);
CREATE POLICY "Org members can insert" ON public.betalningar FOR INSERT TO authenticated
WITH CHECK (
    organisation_id IN (SELECT organisation_id FROM public.organisation_members WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'superadmin')
);
CREATE POLICY "Org members can update" ON public.betalningar FOR UPDATE TO authenticated
USING (
    organisation_id IN (SELECT organisation_id FROM public.organisation_members WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'superadmin')
);
CREATE POLICY "Org members can delete" ON public.betalningar FOR DELETE TO authenticated
USING (
    organisation_id IN (SELECT organisation_id FROM public.organisation_members WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'superadmin')
);

-- ── intakter ──
CREATE POLICY "Org members can read" ON public.intakter FOR SELECT TO authenticated
USING (
    organisation_id IN (SELECT organisation_id FROM public.organisation_members WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'superadmin')
);
CREATE POLICY "Org members can insert" ON public.intakter FOR INSERT TO authenticated
WITH CHECK (
    organisation_id IN (SELECT organisation_id FROM public.organisation_members WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'superadmin')
);
CREATE POLICY "Org members can update" ON public.intakter FOR UPDATE TO authenticated
USING (
    organisation_id IN (SELECT organisation_id FROM public.organisation_members WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'superadmin')
);
CREATE POLICY "Org members can delete" ON public.intakter FOR DELETE TO authenticated
USING (
    organisation_id IN (SELECT organisation_id FROM public.organisation_members WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'superadmin')
);

-- ── utgifter ──
CREATE POLICY "Org members can read" ON public.utgifter FOR SELECT TO authenticated
USING (
    organisation_id IN (SELECT organisation_id FROM public.organisation_members WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'superadmin')
);
CREATE POLICY "Org members can insert" ON public.utgifter FOR INSERT TO authenticated
WITH CHECK (
    organisation_id IN (SELECT organisation_id FROM public.organisation_members WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'superadmin')
);
CREATE POLICY "Org members can update" ON public.utgifter FOR UPDATE TO authenticated
USING (
    organisation_id IN (SELECT organisation_id FROM public.organisation_members WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'superadmin')
);
CREATE POLICY "Org members can delete" ON public.utgifter FOR DELETE TO authenticated
USING (
    organisation_id IN (SELECT organisation_id FROM public.organisation_members WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'superadmin')
);

-- =============================================================
-- KLART — RLS nu baserad på organisation_members, inte session.
-- =============================================================
