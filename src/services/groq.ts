/**
 * Groq API Client for Denty-AI
 *
 * Routes requests through the Supabase Edge Function (groq-proxy) so
 * the Groq API key stays server-side — the client never sees it.
 *
 * The edge function reads GROQ_API_KEY from Supabase Secrets.
 * No API key is needed in the client .env; EXPO_PUBLIC_SUPABASE_URL is enough.
 *
 * Falls back to direct Groq API if EXPO_PUBLIC_GROQ_API_KEY is set locally
 * (useful for developers running the app without Supabase).
 */

import { File } from 'expo-file-system';

export interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GroqResponse {
  content: string;
}

export interface SendMessageOptions {
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

const DEFAULT_SYSTEM_PROMPT =
  'Eres Denty-AI, un asistente clínico dental experto y especializado. ' +
  'Hablas en español de manera breve, directa y profesional. ' +
  'Te basas exclusivamente en los manuales clínicos proporcionados para fundamentar tus respuestas. ' +
  'Si no tienes suficiente información en los fragmentos proporcionados, indícalo claramente al usuario. ' +
  'Puedes analizar archivos adjuntos (imágenes, PDFs) cuando el usuario los proporcione.';

const CHAT_MODEL = 'qwen/qwen3.6-27b';
const WHISPER_MODEL = 'whisper-large-v3';
const EMBEDDING_MODEL = 'text-embedding-3-small';

/**
 * Strips the `<think>…</think>` reasoning block that Qwen (reasoning mode)
 * prepends to its answer, so the user only sees the final response.
 */
function stripReasoningBlock(content: string): string {
  return content.replace(/\n?<think>[\s\S]*?<\/think>\n?/g, '').trim();
}

/**
 * Browser fetch defaults to a ~6s timeout which kills Supabase Edge Function
 * cold starts (5–10 s). We use AbortController with a generous timeout
 * so the first request after a deploy or idle period doesn't fail.
 */
const FETCH_TIMEOUT_MS = 25_000;

/**
 * fetch() wrapper with AbortController timeout.
 * On timeout, throws a user-friendly error in Spanish.
 */
async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number = FETCH_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
    });
    return response;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error(
        'El servidor está tardando demasiado en responder (cold start). ' +
        'Por favor, intenta de nuevo en unos segundos.'
      );
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Returns a friendly Spanish message when the AI backend is not configured.
 */
export function getOfflineMessage(): string {
  return (
    'El asistente Denty-AI requiere conectarse al servidor.\n\n' +
    'Para habilitarlo:\n' +
    '1. Asegúrate de que la Edge Function `groq-proxy` esté desplegada en Supabase.\n' +
    '2. Configura el secreto `GROQ_API_KEY` en Supabase.\n' +
    '3. Alternativamente, agrega `EXPO_PUBLIC_GROQ_API_KEY` en tu archivo .env para desarrollo local.'
  );
}

/**
 * Builds the URL to call for Groq requests.
 * - Production: Supabase Edge Function (key is a Supabase Secret, never exposed)
 * - Dev fallback: direct Groq API if EXPO_PUBLIC_GROQ_API_KEY is in .env
 */
function getProxyUrl(): string {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  if (supabaseUrl) {
    return `${supabaseUrl}/functions/v1/groq-proxy`;
  }
  return 'http://localhost:54321/functions/v1/groq-proxy';
}

function getDirectGroqHeaders(): HeadersInit | null {
  const key = process.env.EXPO_PUBLIC_GROQ_API_KEY ?? process.env.GROQ_API_KEY;
  if (!key) return null;
  return {
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/json',
  };
}

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';

/**
 * Sends a chat completion request.
 * - Routes through the Supabase groq-proxy Edge Function (default).
 * - If no SUPABASE_URL, falls back to direct Groq API with local key.
 */
export async function sendMessage(
  messages: GroqMessage[],
  options?: SendMessageOptions
): Promise<GroqResponse> {
  const systemMessage: GroqMessage = {
    role: 'system',
    content: options?.systemPrompt ?? DEFAULT_SYSTEM_PROMPT,
  };

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  // --- Path 1: Supabase Edge Function proxy (production) ---
  if (supabaseUrl) {
    const response = await fetchWithTimeout(getProxyUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(anonKey ? { 'Authorization': `Bearer ${anonKey}` } : {}),
      },
      body: JSON.stringify({
        endpoint: 'chat/completions',
        payload: {
          model: CHAT_MODEL,
          messages: [systemMessage, ...messages],
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.maxTokens ?? 1024,
          // Qwen3 reasoning mode prepends a long <think> block that truncates
          // under max_tokens; disable it for a direct clinical answer.
          reasoning_effort: 'none',
        },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(
        `Groq proxy error: ${response.status}${errorBody.error ? ` — ${errorBody.error}` : ''}`
      );
    }

    const data = await response.json();
    const content: string = stripReasoningBlock(data.choices?.[0]?.message?.content ?? '');
    return { content };
  }

  // --- Path 2: Direct Groq API fallback (local dev) ---
  const directHeaders = getDirectGroqHeaders();
  if (!directHeaders) {
    throw new Error('GROQ_API_KEY no configurada');
  }

  const response = await fetchWithTimeout(`${GROQ_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: directHeaders,
    body: JSON.stringify({
      model: CHAT_MODEL,
      messages: [systemMessage, ...messages],
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 1024,
      reasoning_effort: 'none',
    }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(
      `Groq API error: ${response.status}${errorBody.error ? ` — ${errorBody.error}` : ''}`
    );
  }

  const data = await response.json();
  const content: string = stripReasoningBlock(data.choices?.[0]?.message?.content ?? '');
  return { content };
}

/**
 * Transcribes audio via Groq Whisper through the proxy.
 *
 * The proxy only receives JSON, so the audio file is read as base64 and sent
 * in the body; the edge function then re-uploads the bytes to Groq as
 * multipart/form-data (Whisper requires the real file, not a device URI).
 */
export async function transcribeAudio(audioUri: string): Promise<string> {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl) {
    let audioBase64: string | null = null;
    try {
      const audioFile = new File(audioUri);
      audioBase64 = await audioFile.base64();
    } catch {
      // expo-file-system unavailable (web) — fall back to sending the URI
    }

    const response = await fetchWithTimeout(getProxyUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(anonKey ? { 'Authorization': `Bearer ${anonKey}` } : {}),
      },
      body: JSON.stringify({
        endpoint: 'audio/transcriptions',
        payload: { model: WHISPER_MODEL },
        ...(audioBase64
          ? {
              audioBase64,
              audioName: audioUri.split('/').pop() ?? 'recording.m4a',
              audioMime: 'audio/m4a',
            }
          : { audioUri }),
      }),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(
        `Groq transcription error: ${response.status}${errorBody.error ? ` — ${errorBody.error}` : ''}`
      );
    }

    const data = await response.json();
    return data.text ?? '';
  }

  // Direct fallback (local dev only, native): Groq's OpenAI-compatible API
  // requires multipart/form-data with a real file — a device URI cannot be
  // sent as JSON.
  const directHeaders = getDirectGroqHeaders();
  if (!directHeaders) {
    throw new Error('GROQ_API_KEY no configurada');
  }

  const form = new FormData();
  form.append('model', WHISPER_MODEL);
  form.append('file', {
    uri: audioUri,
    name: audioUri.split('/').pop() ?? 'recording.m4a',
    type: 'audio/m4a',
  } as unknown as Blob);

  const response = await fetchWithTimeout(`${GROQ_BASE_URL}/audio/transcriptions`, {
    method: 'POST',
    headers: directHeaders,
    body: form,
  });

  if (!response.ok) {
    throw new Error(`Groq transcription error: ${response.status}`);
  }

  const data = await response.json();
  return data.text ?? '';
}

/**
 * Embeds a text query for RAG retrieval via the groq-proxy edge function.
 *
 * The proxy calls the OpenAI embeddings API server-side (text-embedding-3-small,
 * 1536-dim), so the key is never exposed to the client. Returns null when the
 * backend is unreachable so callers can fall back to the offline vectorizer.
 */
export async function embedTextForRetrieval(text: string): Promise<number[] | null> {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) return null;

  try {
    const response = await fetchWithTimeout(getProxyUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(anonKey ? { 'Authorization': `Bearer ${anonKey}` } : {}),
      },
      body: JSON.stringify({
        endpoint: 'embeddings',
        payload: { model: EMBEDDING_MODEL, input: text },
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    return data?.data?.[0]?.embedding ?? null;
  } catch {
    return null;
  }
}
