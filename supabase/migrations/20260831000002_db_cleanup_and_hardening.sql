-- DB cleanup + hardening (database linter).
-- 1. Immutable search_path on RAG functions (lint: function_search_path_mutable).
-- 2. Move pg_trgm out of public (lint: extension_in_public).
-- 3. Drop unused columns: pedagogical_progress.score, diagnosis_sessions.clinical_notes.

SET search_path TO public, extensions;

-- ── 1. Immutable search_path on RAG functions ──────────────────────────────

CREATE OR REPLACE FUNCTION public.match_manuals(
  query_embedding text,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  title text,
  content text,
  source_document text,
  page_number integer,
  similarity float
)
LANGUAGE sql
STABLE
SET search_path = public, extensions
AS $$
  SELECT
    cm.id,
    cm.title,
    cm.content,
    cm.source_document,
    cm.page_number,
    1 - (cm.embedding <=> query_embedding::extensions.vector) AS similarity
  FROM public.clinical_manuals cm
  WHERE cm.embedding IS NOT NULL
  ORDER BY cm.embedding <=> query_embedding::extensions.vector
  LIMIT match_count;
$$;

CREATE OR REPLACE FUNCTION public.match_manuals_by_text(
  search_query text,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  title text,
  content text,
  source_document text,
  page_number integer,
  similarity float
)
LANGUAGE sql
STABLE
SET search_path = public, extensions
AS $$
  SELECT
    cm.id,
    cm.title,
    cm.content,
    cm.source_document,
    cm.page_number,
    similarity(cm.content, search_query) AS similarity
  FROM public.clinical_manuals cm
  WHERE cm.content ILIKE ANY (
    ARRAY(
      SELECT '%' || t || '%'
      FROM unnest(string_to_array(search_query, ' ')) AS t
      WHERE length(t) > 0
    )
  )
  ORDER BY similarity(cm.content, search_query) DESC
  LIMIT match_count;
$$;

GRANT EXECUTE ON FUNCTION public.match_manuals(text, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_manuals_by_text(text, int) TO authenticated;

-- ── 2. Move pg_trgm out of public ──────────────────────────────────────────

ALTER EXTENSION pg_trgm SET SCHEMA extensions;

DROP INDEX IF EXISTS public.idx_manuals_content_trgm;
CREATE INDEX idx_manuals_content_trgm ON public.clinical_manuals USING gin (content extensions.gin_trgm_ops);

-- ── 3. Drop unused columns ─────────────────────────────────────────────────

ALTER TABLE public.pedagogical_progress DROP COLUMN IF EXISTS score;
ALTER TABLE public.diagnosis_sessions DROP COLUMN IF EXISTS clinical_notes;
