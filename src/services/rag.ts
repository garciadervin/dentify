/**
 * RAG (Retrieval-Augmented Generation) Service for Denty-AI
 *
 * Retrieves relevant clinical manual chunks for a query:
 *   1. Semantic vector search via `match_manuals` RPC (pgvector HNSW, cosine).
 *   2. Lexical fallback via `match_manuals_by_text` RPC (pg_trgm).
 *
 * The query is embedded with the same provider as the corpus
 * (OpenAI text-embedding-3-small, 1536 dim) through the groq-proxy edge
 * function. If the semantic embedding is unavailable the vector path is
 * skipped and retrieval degrades to lexical search — embeddings are never
 * silently produced in a different vector space.
 */

import { getSupabase } from '@/src/lib/supabase';
import {
  sendMessage,
  embedTextForRetrieval,
  type GroqMessage,
  type GroqResponse,
} from '@/src/services/groq';

export interface ChunkResult {
  id: string;
  content: string;
  title: string;
  source: string;
  similarity: number;
  page?: number;
}

export const CLINICAL_SYSTEM_PROMPT =
  'Eres Denty-AI, un asistente clínico dental experto y especializado. ' +
  'Hablas en español de manera breve, directa y profesional. ' +
  'Te basas exclusivamente en los manuales clínicos proporcionados para fundamentar tus respuestas. ' +
  'Si no tienes suficiente información en los fragmentos proporcionados, indícalo claramente al usuario. ' +
  'Puedes analizar archivos adjuntos (imágenes, PDFs) cuando el usuario los proporcione.';

const MATCH_COUNT = 5;

/**
 * Extracts meaningful terms from a query for lexical search.
 */
function extractSearchTerms(query: string): string[] {
  const stopWords = new Set([
    'que', 'como', 'para', 'con', 'por', 'del', 'las', 'los', 'una',
    'dime', 'explica', 'puedo', 'debe', 'deben', 'tiene', 'tienen',
    'esta', 'este', 'cual',
  ]);

  return query
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 3 && !stopWords.has(word))
    .slice(0, 5); // max 5 terms
}

/** Maps a row from either search RPC (or a plain select) to a ChunkResult. */
function mapRow(row: any): ChunkResult {
  return {
    id: row.id,
    content: row.content,
    title: row.title,
    source: row.source_document ?? '',
    similarity: typeof row.similarity === 'number' ? row.similarity : 0,
    page: typeof row.page_number === 'number' ? row.page_number : undefined,
  };
}

/**
 * Retrieves relevant chunks from clinical_manuals.
 * Semantic vector search first, trigram fallback, empty array when the
 * backend is unavailable.
 */
export async function retrieveRelevantChunks(query: string): Promise<ChunkResult[]> {
  const supabase = getSupabase();
  if (!supabase) {
    return [];
  }

  // 1) Semantic vector search (pgvector) — PRD §8
  const queryEmbedding = await embedTextForRetrieval(query);
  if (queryEmbedding) {
    try {
      const { data, error } = await supabase.rpc('match_manuals', {
        query_embedding: JSON.stringify(queryEmbedding),
        match_count: MATCH_COUNT,
      });
      if (!error && Array.isArray(data) && data.length > 0) {
        return data.map(mapRow);
      }
    } catch {
      // vector path unavailable — fall through to lexical search
    }
  }

  // 2) Lexical search (pg_trgm similarity)
  try {
    const searchQuery = extractSearchTerms(query).join(' ');
    if (!searchQuery) {
      const { data } = await supabase
        .from('clinical_manuals')
        .select('id, title, content, source_document, page_number')
        .limit(MATCH_COUNT);
      return (data ?? []).map(mapRow);
    }

    const { data } = await supabase.rpc('match_manuals_by_text', {
      search_query: searchQuery,
      match_count: MATCH_COUNT,
    });
    return (data ?? []).map(mapRow);
  } catch {
    return [];
  }
}

/**
 * Builds the augmented user message for RAG: retrieved context + the query.
 * The clinical system prompt is added as a system message by the caller
 * (sendMessage), so it is not duplicated here.
 */
export function generatePrompt(query: string, context: ChunkResult[]): string {
  let prompt = '';

  if (context.length > 0) {
    prompt += '## Contexto de manuales clínicos\n\n';
    context.forEach((chunk, index) => {
      prompt += `[${index + 1}] ${chunk.content}\n\n`;
    });
  }

  prompt += `## Pregunta del usuario\n\n${query}`;

  return prompt;
}

/**
 * Combines RAG context with the conversation and sends it to the AI.
 * 1. Takes the last user message
 * 2. Retrieves relevant chunks (vector first, lexical fallback)
 * 3. Augments the last user message with the context
 * 4. Sends the full conversation history to Groq
 * 5. Returns the response
 */
export async function chatWithContext(messages: GroqMessage[]): Promise<GroqResponse> {
  // Find the last user message
  const lastUserIndex = [...messages].map((m) => m.role).lastIndexOf('user');
  if (lastUserIndex === -1) {
    throw new Error('No user message in conversation');
  }
  const lastUser = messages[lastUserIndex];
  const query = lastUser.content;

  // Retrieve relevant context
  const context = await retrieveRelevantChunks(query);

  // Augment only the last user message; keep the rest of the history intact.
  const augmentedMessages: GroqMessage[] = [
    ...messages.slice(0, lastUserIndex),
    { role: 'user', content: generatePrompt(query, context) },
  ];

  return sendMessage(augmentedMessages, { systemPrompt: CLINICAL_SYSTEM_PROMPT });
}
