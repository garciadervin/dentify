-- Security hardening from the audits.
-- 1. Self-service signup can only create STUDENT profiles. Teacher access
--    reveals every student's progress and PII, so it must be provisioned by an
--    admin via private.promote_to_teacher — never self-selected.
-- 2. Admin-only teacher promotion helper (SECURITY DEFINER, private schema).
-- 3. FK index on user_badges.badge_id.
-- 4. Owner-scoped DELETE policies (the app can delete its own chats/history).
-- 5. profiles.updated_at maintenance trigger.
-- 6. Explicit GRANTs to `authenticated` (future-proof: PostgREST auto-expose
--    of new tables is being removed).

SET search_path TO public, extensions;

-- ── 1. Student-only self-signup ─────────────────────────────────────────────

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id AND role = 'student');

-- ── 2. Admin-only teacher promotion ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION private.promote_to_teacher(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Solo un administrador puede promover a docente';
  END IF;

  UPDATE auth.users
     SET raw_user_meta_data =
         COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('role', 'teacher')
   WHERE id = target_user_id;

  UPDATE public.profiles SET role = 'teacher' WHERE id = target_user_id;
END;
$$;

REVOKE ALL ON FUNCTION private.promote_to_teacher(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.promote_to_teacher(uuid) TO authenticated;

-- ── 3. FK index ─────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_user_badges_badge ON public.user_badges (badge_id);

-- ── 4. Owner-scoped DELETE policies ─────────────────────────────────────────

DROP POLICY IF EXISTS "Users can delete own conversations" ON public.ai_conversations;
CREATE POLICY "Users can delete own conversations"
  ON public.ai_conversations FOR DELETE TO authenticated
  USING (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Users can delete own answers" ON public.answer_history;
CREATE POLICY "Users can delete own answers"
  ON public.answer_history FOR DELETE TO authenticated
  USING (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Users can delete own diagnosis sessions" ON public.diagnosis_sessions;
CREATE POLICY "Users can delete own diagnosis sessions"
  ON public.diagnosis_sessions FOR DELETE TO authenticated
  USING (auth.uid() = profile_id);

-- ── 5. profiles.updated_at trigger ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION private.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION private.set_updated_at();

-- ── 6. Explicit grants to authenticated (REST access) ──────────────────────

GRANT SELECT ON public.specialties, public.levels, public.badges, public.clinical_manuals TO authenticated;
GRANT SELECT, INSERT ON public.questions TO authenticated;
GRANT SELECT ON public.clinical_cases TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.answer_history TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pedagogical_progress TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.user_badges TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_conversations TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.diagnosis_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
