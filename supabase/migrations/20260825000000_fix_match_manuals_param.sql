-- PostgREST cannot map an RPC argument whose type (`extensions.vector`) lives in
-- a schema that is not exposed to the Data API. Take the embedding as text and
-- cast it inside the function body; the HNSW index is still used because the
-- cast yields a constant on the right-hand side of `<=>`.

SET search_path TO public, extensions;

DROP FUNCTION IF EXISTS public.match_manuals(extensions.vector, int);

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

GRANT EXECUTE ON FUNCTION public.match_manuals(text, int) TO authenticated;
