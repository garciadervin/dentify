-- The previous lexical fallback required the full joined phrase to appear
-- contiguously in a chunk (`ILIKE '%term1 term2%'`), which rarely matched.
-- Match ANY term instead and rank by whole-query trigram similarity.

SET search_path TO public, extensions;

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

GRANT EXECUTE ON FUNCTION public.match_manuals_by_text(text, int) TO authenticated;
