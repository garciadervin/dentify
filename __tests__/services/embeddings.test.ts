import { embedText, embedQuery, fnv1a, tokenize, EMBEDDING_DIMENSION } from '@/src/services/embeddings';

function cosine(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

describe('RAG embeddings (deterministic vectorizer)', () => {
  it('produces unit vectors of the configured dimension', () => {
    expect(EMBEDDING_DIMENSION).toBe(1536);
    const vec = embedText('Periodontitis y caries dental');
    expect(vec).toHaveLength(1536);

    const norm = Math.sqrt(vec.reduce((acc, v) => acc + v * v, 0));
    expect(norm).toBeCloseTo(1, 4);
  });

  it('is deterministic (same text → same vector)', () => {
    const text = 'El protocolo de endodoncia incluye el aislamiento absoluto.';
    expect(embedText(text)).toEqual(embedText(text));
    expect(embedQuery(text)).toEqual(embedText(text));
  });

  it('ranks related chunks above unrelated ones', () => {
    const query = embedQuery('¿qué es la periodontitis?');
    const related = embedText('La periodontitis es la inflamación del periodonto.');
    const unrelated = embedText('El hueso maxilar y la anatomía de la mandíbula');

    expect(cosine(query, related)).toBeGreaterThan(cosine(query, unrelated));
  });

  it('normalizes accents and ignores stop words', () => {
    const tokens = tokenize('Él explica la caries dental. La paciente acude a consulta.');
    expect(tokens).not.toContain('la');
    expect(tokens).not.toContain('explica');
    expect(tokens).toContain('caries');
    expect(tokens).toContain('paciente');
  });

  it('fnv1a hash matches the canonical value (client/server contract)', () => {
    // Locks the algorithm shared with scripts/ingest-rag.mjs. If this value
    // changes, embeddings no longer match the ingested corpus — update both
    // src/services/embeddings.ts and scripts/ingest-rag.mjs together.
    expect(fnv1a('periodontitis')).toBe(1059891082);
    expect(fnv1a('caries')).toBe(237450588);
  });
});
