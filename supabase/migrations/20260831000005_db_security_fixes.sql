-- Security fixes from the adversarial review.
-- 1. Role immutability: a user cannot change their own `role` nor self-register
--    as `admin` (the role is set once at profile creation from signup metadata).
-- 2. Fix the teacher dashboard: teachers can read other users' profiles.
--    The role check uses a SECURITY DEFINER helper (bypasses RLS on its own
--    query, guarded by auth.uid()) to avoid infinite policy recursion — a
--    plain `EXISTS (SELECT 1 FROM profiles ...)` inside a profiles policy
--    recurses.

SET search_path TO public, extensions;

-- ── Role check helper (SECURITY DEFINER: reveals only the caller's own role) ──

CREATE OR REPLACE FUNCTION public.has_role(required text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = required
  )
$$;

REVOKE ALL ON FUNCTION public.has_role(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(text) TO authenticated;

-- ── 1. Role immutability ────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id AND role IS DISTINCT FROM 'admin');

-- ── 2. Teacher access to student profiles (teacher dashboard) ───────────────

DROP POLICY IF EXISTS "Teachers can view all profiles" ON public.profiles;
CREATE POLICY "Teachers can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.has_role('teacher'));

-- Rewrite the pre-existing progress policy to use the recursion-safe helper too.
DROP POLICY IF EXISTS "Teachers can view all progress" ON public.pedagogical_progress;
CREATE POLICY "Teachers can view all progress"
  ON public.pedagogical_progress FOR SELECT
  TO authenticated
  USING (public.has_role('teacher'));

-- And the admin manual-management policies.
DROP POLICY IF EXISTS "Admins can update clinical manuals" ON public.clinical_manuals;
CREATE POLICY "Admins can update clinical manuals"
  ON public.clinical_manuals FOR UPDATE
  USING (public.has_role('admin'))
  WITH CHECK (public.has_role('admin'));
