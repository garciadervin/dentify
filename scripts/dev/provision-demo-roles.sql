-- ============================================================================
-- DEV/QA ONLY — promote an existing Supabase user to teacher or admin.
-- This is NOT a migration (filename prefix `dev-`), so `supabase db push` and
-- `supabase db reset` will never apply it. Run it manually:
--
--   supabase db query --linked < scripts/dev/provision-demo-roles.sql
--
-- IMPORTANT: granting teacher/admin is a privilege escalation; never run this
-- against a production tenant except for a deliberate, revocable QA account.
-- Change the two variables below before running.
-- ============================================================================

DO $$
DECLARE
  v_email text := 'demo@dentify.app';   -- << set the target email
  v_role  text := 'teacher';            -- << 'teacher' or 'admin'
  v_uid   uuid;
BEGIN
  SELECT id INTO v_uid FROM auth.users WHERE email = v_email;
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'No existe el usuario con correo %', v_email;
  END IF;

  -- Role lives in auth.user_metadata so route guards (AuthGuard) can read it.
  UPDATE auth.users
     SET raw_user_meta_data =
         COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('role', v_role)
   WHERE id = v_uid;

  -- Mirror it into the profiles table (source of truth for RLS helpers).
  UPDATE public.profiles SET role = v_role WHERE id = v_uid;

  RAISE NOTICE 'Promovido % a rol % (user %)', v_email, v_role, v_uid;
END $$;
