/**
 * RAG (Retrieval-Augmented Generation) Service for Denty-AI
 *
 * Retrieves relevant clinical manual chunks using text search (ILIKE) since
 * embeddings are not yet available. Falls back gracefully when Supabase is
 * not configured.
 */

import { getSupabase } from '@/src/lib/supabase';
import { sendMessage, type GroqMessage, type GroqResponse } from '@/src/services/groq';

export interface ChunkResult {
  id: string;
  content: string;
  title: string;
  source: string;
  similarity: number;
}

const SYSTEM_PROMPT =
  'Eres Denty-AI, un asistente clínico dental experto y especializado. ' +
  'Hablas en español de manera breve, directa y profesional. ' +
  'Te basas exclusivamente en los manuales clínicos proporcionados para fundamentar tus respuestas. ' +
  'Si no tienes suficiente información en los fragmentos proporcionados, indícalo claramente al usuario. ' +
  'Puedes analizar archivos adjuntos (imágenes, PDFs) cuando el usuario los proporcione.';

/**
 * Extracts key terms from a query for text search.
 */
function extractSearchTerms(query: string): string[] {
  // Remove common words and extract meaningful terms
  const stopWords = new Set([
    'que', 'como', 'para', 'con', 'por', 'del', 'las', 'los', 'una',
    'cual', 'que es', 'que son', 'dime', 'explica', 'cuál', 'cuáles',
    'puedo', 'debe', 'deben', 'tiene', 'tienen', 'esta', 'este',
  ]);

  return query
    .toLowerCase()
    .replace(/[¿?!¡,;.:]/g, '')
    .split(/\s+/)
    .filter((word) => word.length > 3 && !stopWords.has(word))
    .slice(0, 5); // max 5 terms
}

/**
 * Retrieves relevant chunks from clinical_manuals using text search.
 * Returns an empty array if Supabase is not configured.
 */
export async function retrieveRelevantChunks(query: string): Promise<ChunkResult[]> {
  const supabase = getSupabase();
  if (!supabase) {
    return [];
  }

  try {
    const terms = extractSearchTerms(query);

    if (terms.length === 0) {
      // Fallback: get most recent chunks
      const { data } = await supabase
        .from('clinical_manuals')
        .select('id, title, content, source_document')
        .limit(5);

      return ((data ?? []) as Array<{ id: string; title: string; content: string; source_document: string | null }>).map((item) => ({
        id: item.id,
        content: item.content,
        title: item.title,
        source: item.source_document ?? '',
        similarity: 0,
      }));
    }

    // Build OR conditions for each search term
    const conditions = terms.map((term) => `content.ilike.%${term}%`);
    const { data } = await supabase
      .from('clinical_manuals')
      .select('id, title, content, source_document')
      .or(conditions.join(','))
      .limit(5);

    return ((data ?? []) as Array<{ id: string; title: string; content: string; source_document: string | null }>).map((item) => ({
      id: item.id,
      content: item.content,
      title: item.title,
      source: item.source_document ?? '',
      similarity: 0,
    }));
  } catch {
    return [];
  }
}

/**
 * Builds a prompt with system instructions, clinical context, and user query.
 */
export function generatePrompt(query: string, context: ChunkResult[]): string {
  let prompt = `${SYSTEM_PROMPT}\n\n`;

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
 * Combines RAG context with the user's message and sends to Groq API.
 * 1. Takes the last user message
 * 2. Retrieves relevant chunks from pgvector
 * 3. Builds an augmented prompt with context
 * 4. Sends to Groq API
 * 5. Returns the response
 */
export async function chatWithContext(messages: GroqMessage[]): Promise<GroqResponse> {
  // Find the last user message
  const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
  const query = lastUserMessage?.content ?? '';

  // Retrieve relevant context
  const context = await retrieveRelevantChunks(query);

  // Build augmented prompt
  const augmentedPrompt = generatePrompt(query, context);

  // Send to Groq with the augmented prompt as system context
  const response = await sendMessage(
    [{ role: 'user', content: augmentedPrompt }],
    { systemPrompt: SYSTEM_PROMPT }
  );

  return response;
}
