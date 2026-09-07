-- Normalization (BCNF): children reference `specialties` by ONE identifier.
-- Previously `questions` referenced it by slug and `pedagogical_progress` by
-- display name — two natural keys for the same entity, fragile under renames
-- and a duplicated-reference smell. Both now carry a surrogate FK to
-- specialties(id); the text/slug columns are removed from the children.

SET search_path TO public, extensions;

-- ── questions.specialty_id ──────────────────────────────────────────────────

ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS specialty_id uuid;

UPDATE public.questions q
   SET specialty_id = s.id
  FROM public.specialties s
 WHERE q.specialty_slug = s.slug;

ALTER TABLE public.questions ALTER COLUMN specialty_id SET NOT NULL;

ALTER TABLE public.questions DROP CONSTRAINT IF EXISTS questions_specialty_slug_fkey;
ALTER TABLE public.questions ADD CONSTRAINT questions_specialty_id_fkey
  FOREIGN KEY (specialty_id) REFERENCES public.specialties(id);

ALTER TABLE public.questions DROP COLUMN specialty_slug;

DROP INDEX IF EXISTS idx_questions_specialty_id;
CREATE INDEX idx_questions_specialty_id ON public.questions (specialty_id);

-- ── pedagogical_progress.specialty_id ───────────────────────────────────────

ALTER TABLE public.pedagogical_progress ADD COLUMN IF NOT EXISTS specialty_id uuid;

UPDATE public.pedagogical_progress pp
   SET specialty_id = s.id
  FROM public.specialties s
 WHERE pp.specialty = s.name;

-- Rows without a matching specialty are meaningless and would block NOT NULL.
DELETE FROM public.pedagogical_progress WHERE specialty_id IS NULL;

ALTER TABLE public.pedagogical_progress ALTER COLUMN specialty_id SET NOT NULL;

ALTER TABLE public.pedagogical_progress DROP CONSTRAINT IF EXISTS pedagogical_progress_specialty_fkey;
ALTER TABLE public.pedagogical_progress DROP CONSTRAINT IF EXISTS pedagogical_progress_profile_id_specialty_level_key;

ALTER TABLE public.pedagogical_progress DROP COLUMN specialty;

ALTER TABLE public.pedagogical_progress
  ADD CONSTRAINT pedagogical_progress_profile_id_specialty_level_key
  UNIQUE (profile_id, specialty_id, level);

ALTER TABLE public.pedagogical_progress ADD CONSTRAINT pedagogical_progress_specialty_id_fkey
  FOREIGN KEY (specialty_id) REFERENCES public.specialties(id);

DROP INDEX IF EXISTS idx_progress_specialty;
CREATE INDEX idx_progress_specialty_id ON public.pedagogical_progress (specialty_id);
