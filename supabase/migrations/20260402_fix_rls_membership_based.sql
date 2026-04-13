-- =============================================================
-- FIX: RLS policies based on org MEMBERSHIP instead of session variable
-- Drop ALL existing org policies first, then recreate.
-- =============================================================

-- ── Drop ALL existing policies on these tables ──
DROP POLICY IF EXISTS "Org members can read" ON public.familjer;
DROP POLICY IF EXISTS "Org members can insert" ON public.familjer;
DROP POLICY IF EXISTS "Org members can update" ON public.familjer;
DROP POLICY IF EXISTS "Org members can delete" ON public.familjer;

DROP POLICY IF EXISTS "Org members can read" ON public.barn;
DROP POLICY IF EXISTS "Org members can insert" ON public.barn;
DROP POLICY IF EXISTS "Org members can update" ON public.barn;
DROP POLICY IF EXISTS "Org members can delete" ON public.barn;

DROP POLICY IF EXISTS "Org members can read" ON public.betalningar;
DROP POLICY IF EXISTS "Org members can insert" ON public.betalningar;
DROP POLICY IF EXISTS "Org members can update" ON public.betalningar;
DROP POLICY IF EXISTS "Org members can delete" ON public.betalningar;

DROP POLICY IF EXISTS "Org members can read" ON public.intakter;
DROP POLICY IF EXISTS "Org members can insert" ON public.intakter;
DROP POLICY IF EXISTS "Org members can update" ON public.intakter;
DROP POLICY IF EXISTS "Org members can delete" ON public.intakter;

DROP POLICY IF EXISTS "Org members can read" ON public.utgifter;
DROP POLICY IF EXISTS "Org members can insert" ON public.utgifter;
DROP POLICY IF EXISTS "Org members can update" ON public.utgifter;
DROP POLICY IF EXISTS "Org members can delete" ON public.utgifter;

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
