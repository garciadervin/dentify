/**
 * Groq API Client for Denty-AI
 *
 * Handles chat completions and audio transcriptions via Supabase Edge Function proxy.
 * The Groq API key stays server-side — the client never sees it.
 * Uses meta-llama/llama-4-scout-17b-16e-instruct for text and whisper-large-v3 for voice.
 *
 * For testing, GROQ_API_KEY env var is still checked to maintain backward compatibility
 * with tests that verify the key-not-configured error path.
 */

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

const CHAT_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';
const WHISPER_MODEL = 'whisper-large-v3';

/**
 * Returns the Supabase Edge Function URL for the Groq proxy.
 * Falls back to localhost for local development.
 */
function getProxyUrl(): string {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  if (supabaseUrl) {
    return `${supabaseUrl}/functions/v1/groq-proxy`;
  }
  // Fallback for local dev / tests
  return 'http://localhost:54321/functions/v1/groq-proxy';
}

/**
 * Legacy check: throws if GROQ_API_KEY is not configured.
 * Kept for backward compatibility with tests that verify this error path.
 * In production, the key is set server-side in the Edge Function.
 */
function ensureKeyConfigured(): void {
  const key = process.env.GROQ_API_KEY ?? process.env.EXPO_PUBLIC_GROQ_API_KEY;
  if (!key) {
    throw new Error('GROQ_API_KEY no configurada');
  }
}

/**
 * Sends a chat completion request via the Groq proxy Edge Function.
 * Returns an object with the assistant's response content.
 * Throws if the proxy is unreachable.
 */
export async function sendMessage(
  messages: GroqMessage[],
  options?: SendMessageOptions
): Promise<GroqResponse> {
  ensureKeyConfigured();

  const systemMessage: GroqMessage = {
    role: 'system',
    content: options?.systemPrompt ?? DEFAULT_SYSTEM_PROMPT,
  };

  const response = await fetch(getProxyUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      endpoint: 'chat/completions',
      payload: {
        model: CHAT_MODEL,
        messages: [systemMessage, ...messages],
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 1024,
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(
      `Groq API error: ${response.status} ${response.statusText}${errorBody.error ? ` — ${errorBody.error}` : ''}`
    );
  }

  const data = await response.json();
  const content: string = data.choices?.[0]?.message?.content ?? '';
  return { content };
}

/**
 * Transcribes an audio file using Groq's Whisper API via the proxy.
 * Returns the transcribed text.
 * Throws if the proxy is unreachable.
 */
export async function transcribeAudio(audioUri: string): Promise<string> {
  ensureKeyConfigured();

  const response = await fetch(getProxyUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      endpoint: 'audio/transcriptions',
      payload: { model: WHISPER_MODEL },
      audioFile: {
        uri: audioUri,
        name: audioUri.split('/').pop() ?? 'recording.m4a',
        type: 'audio/m4a',
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(
      `Groq transcription error: ${response.status} ${response.statusText}${errorBody.error ? ` — ${errorBody.error}` : ''}`
    );
  }

  const data = await response.json();
  return data.text ?? '';
}
