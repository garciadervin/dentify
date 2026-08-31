-- Security & performance hardening (Supabase best-practices skill).
-- 1. Index foreign-key columns (fast JOINs and cascades).
-- 2. WITH CHECK on UPDATE policies: without it a user can reassign a row's
--    owner column (e.g. profile_id) to another user (BOLA / IDOR).

SET search_path TO public, extensions;

-- ── 1. Foreign-key indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_progress_specialty ON public.pedagogical_progress(specialty);
CREATE INDEX IF NOT EXISTS idx_questions_case_id ON public.questions(case_id);

-- ── 2. WITH CHECK on UPDATE policies ───────────────────────────────────────

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own progress" ON public.pedagogical_progress;
CREATE POLICY "Users can update own progress"
  ON public.pedagogical_progress FOR UPDATE
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Users can update own conversations" ON public.ai_conversations;
CREATE POLICY "Users can update own conversations"
  ON public.ai_conversations FOR UPDATE
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Admins can update clinical manuals" ON public.clinical_manuals;
CREATE POLICY "Admins can update clinical manuals"
  ON public.clinical_manuals FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
