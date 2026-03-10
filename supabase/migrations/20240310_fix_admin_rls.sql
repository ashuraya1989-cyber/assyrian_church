-- 1. Skapa en säkerhetsfunktion ("SECURITY DEFINER") som kan läsa roller utan att trigga oändliga loopar i RLS.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  user_role public.user_role;
BEGIN
  SELECT role INTO user_role FROM public.user_profiles WHERE id = auth.uid();
  RETURN user_role IN ('admin', 'superadmin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Ta bort de gamla RLS-reglerna som orsakade oändlig loop:
DO $$
BEGIN
    DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;
    DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
    DROP POLICY IF EXISTS "Admins can update profiles" ON public.user_profiles;
    DROP POLICY IF EXISTS "Admins can insert profiles" ON public.user_profiles;
    DROP POLICY IF EXISTS "Admins can delete profiles" ON public.user_profiles;
END $$;

-- 3. Återskapa RLS-reglerna, men använd säkerhetsfunktionen "is_admin()" denna gång!
CREATE POLICY "Users can view own profile" 
ON public.user_profiles FOR SELECT TO authenticated USING (id = auth.uid());

CREATE POLICY "Admins can view all profiles" 
ON public.user_profiles FOR SELECT TO authenticated USING (public.is_admin());

CREATE POLICY "Admins can update profiles" 
ON public.user_profiles FOR UPDATE TO authenticated USING (public.is_admin());

CREATE POLICY "Admins can insert profiles" 
ON public.user_profiles FOR INSERT TO authenticated, service_role
WITH CHECK (
    current_user = 'service_role' OR public.is_admin()
);

CREATE POLICY "Admins can delete profiles" 
ON public.user_profiles FOR DELETE TO authenticated USING (public.is_admin());
