-- DB normalization pass (2NF–3NF, BCNF).
-- 1. Referential integrity: FK constraints for the denormalized references.
-- 2. Remove the transitive dependency in `questions`: case_text depends on
--    case_id (a non-key column), so a clinical case's text is duplicated across
--    every sub-question. Moved to a `clinical_cases` table (3NF).

SET search_path TO public, extensions;

-- ── 1. Referential integrity ───────────────────────────────────────────────

-- specialties.name is the natural key the app uses as a reference.
ALTER TABLE public.specialties ADD CONSTRAINT specialties_name_key UNIQUE (name);

-- questions.specialty_slug → specialties(slug)
ALTER TABLE public.questions
  ADD CONSTRAINT questions_specialty_slug_fkey
  FOREIGN KEY (specialty_slug) REFERENCES public.specialties(slug);

-- pedagogical_progress.specialty stores the specialty name → specialties(name)
ALTER TABLE public.pedagogical_progress
  ADD CONSTRAINT pedagogical_progress_specialty_fkey
  FOREIGN KEY (specialty) REFERENCES public.specialties(name);

-- ── 2. clinical_cases: remove the case_id → case_text transitive dependency ──

CREATE TABLE public.clinical_cases (
  id text PRIMARY KEY,
  text text NOT NULL
);

ALTER TABLE public.clinical_cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Cases readable"
  ON public.clinical_cases FOR SELECT
  TO authenticated
  USING (true);

-- Backfill from the existing questions (one row per case).
INSERT INTO public.clinical_cases (id, text)
SELECT DISTINCT case_id, case_text
FROM public.questions
WHERE case_id IS NOT NULL AND case_text IS NOT NULL;

ALTER TABLE public.questions DROP COLUMN IF EXISTS case_text;

ALTER TABLE public.questions
  ADD CONSTRAINT questions_case_id_fkey
  FOREIGN KEY (case_id) REFERENCES public.clinical_cases(id);
