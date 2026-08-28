-- RAG vector & lexical search functions for Denty-AI.
-- Adds the pgvector RPC the app calls for semantic retrieval (PRD §6, FR-03)
-- and a pg_trgm fallback for when embeddings are NULL.

-- The pgvector extension was moved to the `extensions` schema (see migration
-- 20260607042702_move_vector_to_extensions_schema), but the migration runner
-- starts with search_path = public, so resolve types/operators explicitly.
SET search_path TO public, extensions;

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Cosine similarity search over clinical_manuals embeddings.
-- The `<=>` operator uses the HNSW index created in the initial schema.
-- NOTE: the pgvector extension lives in the `extensions` schema (see migration
-- 20260607042702_move_vector_to_extensions_schema). The embedding argument is
-- `text` and cast inside the body because PostgREST cannot map an RPC argument
-- whose type lives in a non-exposed schema.
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

-- Lexical fallback using trigram similarity on the chunk text.
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
AS $$
  SELECT
    cm.id,
    cm.title,
    cm.content,
    cm.source_document,
    cm.page_number,
    similarity(cm.content, search_query) AS similarity
  FROM public.clinical_manuals cm
  WHERE cm.content ILIKE '%' || search_query || '%'
  ORDER BY similarity(cm.content, search_query) DESC
  LIMIT match_count;
$$;

-- Gin index to speed up ILIKE / similarity() on chunk content.
CREATE INDEX IF NOT EXISTS idx_manuals_content_trgm ON public.clinical_manuals USING gin (content gin_trgm_ops);

-- RLS on clinical_manuals already grants SELECT to authenticated.
GRANT EXECUTE ON FUNCTION public.match_manuals(text, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_manuals_by_text(text, int) TO authenticated;
