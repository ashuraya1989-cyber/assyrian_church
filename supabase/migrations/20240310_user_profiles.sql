-- Create an enum for user roles
CREATE TYPE user_role AS ENUM ('superadmin', 'admin', 'user');

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

-- 1. Admins and Superadmins can read all profiles
CREATE POLICY "Admins can view all profiles" 
ON public.user_profiles FOR SELECT 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_profiles up 
        WHERE up.id = auth.uid() 
        AND (up.role = 'superadmin' OR up.role = 'admin')
    )
);

-- 2. ALL users can view their own profile (this is necessary!)
CREATE POLICY "Users can view own profile" 
ON public.user_profiles FOR SELECT 
TO authenticated
USING (id = auth.uid());

-- 3. Admins and Superadmins can update profiles
CREATE POLICY "Admins can update profiles" 
ON public.user_profiles FOR UPDATE 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_profiles up 
        WHERE up.id = auth.uid() 
        AND (up.role = 'superadmin' OR up.role = 'admin')
    )
);

-- 4. Admins and Superadmins can insert profiles (needed for creation)
CREATE POLICY "Admins can insert profiles" 
ON public.user_profiles FOR INSERT 
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_profiles up 
        WHERE up.id = auth.uid() 
        AND (up.role = 'superadmin' OR up.role = 'admin')
    )
);

-- 5. Admins and Superadmins can delete profiles
CREATE POLICY "Admins can delete profiles" 
ON public.user_profiles FOR DELETE 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_profiles up 
        WHERE up.id = auth.uid() 
        AND (up.role = 'superadmin' OR up.role = 'admin')
    )
);

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    is_first_user BOOLEAN;
BEGIN
    -- Check if this is the very first user in the auth.users table
    SELECT NOT EXISTS (SELECT 1 FROM public.user_profiles) INTO is_first_user;

    INSERT INTO public.user_profiles (id, email, role, permissions)
    VALUES (
        NEW.id,
        NEW.email,
        -- If first user, make them superadmin. Otherwise, default to 'user'
        CASE WHEN is_first_user THEN 'superadmin'::user_role ELSE 'user'::user_role END,
        -- If first user, give all permissions. Otherwise none.
        CASE WHEN is_first_user THEN '["register", "payments", "income", "expenses", "stats", "settings", "users"]'::jsonb ELSE '[]'::jsonb END
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
            user_record.id, 
            user_record.email, 
            CASE WHEN is_first THEN 'superadmin'::user_role ELSE 'user'::user_role END,
            CASE WHEN is_first THEN '["register", "payments", "income", "expenses", "stats", "settings", "users"]'::jsonb ELSE '[]'::jsonb END
        );
        is_first := false;
    END LOOP;
END;
$$;
