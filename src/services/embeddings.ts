/**
 * Deterministic lexical embedding (hashing bag-of-words) for Denty-AI RAG.
 *
 * Produces a fixed 1536-dim unit vector from Spanish text without any API key,
 * so query embedding works offline in Expo Go. The ingestion script
 * (scripts/ingest-rag.mjs) implements the EXACT same algorithm — keep the two
 * in sync so retrieval cosine similarity is meaningful.
 */

const EMBEDDING_DIM = 1536;

const STOP_WORDS = new Set([
  'que', 'para', 'como', 'con', 'por', 'del', 'las', 'los', 'una', 'uno',
  'unos', 'unas', 'cual', 'cuales', 'dime', 'explica', 'puedo', 'debe',
  'deben', 'tiene', 'tienen', 'esta', 'este', 'esto', 'estos', 'estas', 'ser',
  'son', 'era', 'mas', 'pero', 'sin', 'sobre', 'entre', 'hacia', 'desde',
  'hasta', 'todo', 'toda', 'todos', 'todas', 'sus', 'su', 'sea', 'sean', 'hay',
  'fue', 'nada', 'muy', 'asi', 'cada', 'luego', 'donde', 'cuando',
]);

/** 32-bit FNV-1a hash — must match scripts/ingest-rag.mjs exactly. */
export function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Normalize Spanish text to lowercase accent-free tokens. */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

/**
 * Returns a deterministic 1536-dim L2-normalized bag-of-words vector.
 */
export function embedText(text: string): number[] {
  const vec = new Array<number>(EMBEDDING_DIM).fill(0);
  for (const token of tokenize(text)) {
    vec[fnv1a(token) % EMBEDDING_DIM] += 1;
  }

  let norm = 0;
  for (let i = 0; i < EMBEDDING_DIM; i++) norm += vec[i] * vec[i];
  norm = Math.sqrt(norm);
  if (norm === 0) return vec;
  for (let i = 0; i < EMBEDDING_DIM; i++) vec[i] /= norm;
  return vec;
}

/** Embed a user query for vector retrieval. */
export function embedQuery(query: string): number[] {
  return embedText(query);
}

export const EMBEDDING_DIMENSION = EMBEDDING_DIM;
