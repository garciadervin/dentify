/**
 * Groq API Proxy — Supabase Edge Function
 *
 * Proxies AI requests so API keys stay server-side:
 *   - chat/completions    → Groq (Qwen 3.6 27B)
 *   - audio/transcriptions → Groq Whisper (multipart, real file bytes)
 *   - embeddings          → OpenAI text-embedding-3-small (RAG queries)
 *
 * POST /functions/v1/groq-proxy
 * Body:
 *   { endpoint: "chat/completions", payload: object }
 *   { endpoint: "audio/transcriptions", payload: { model, ... }, audioBase64?, audioName?, audioMime? }
 *   { endpoint: "embeddings", payload: { model, input } }
 *
 * Audio transcription is re-uploaded as multipart/form-data because Whisper
 * requires the real file bytes (a device URI is useless server-side). The
 * mobile app reads the recording to base64 and sends it here; keep clips short
 * enough to stay under the function's request body limit.
 */

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';

const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';
const OPENAI_BASE_URL = 'https://api.openai.com/v1';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/** Decode a base64 string into bytes (Deno exposes atob globally). */
function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return bytes;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (!GROQ_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'GROQ_API_KEY not configured on server' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { endpoint, payload, audioBase64, audioName, audioMime } = await req.json();

    // Whitelist allowed endpoints so the proxy cannot be used as an open relay.
    const ALLOWED_ENDPOINTS = ['chat/completions', 'audio/transcriptions', 'embeddings'];
    if (!endpoint || !ALLOWED_ENDPOINTS.includes(endpoint)) {
      return jsonResponse({ error: 'Endpoint not allowed' }, 400);
    }
    if (!payload || typeof payload !== 'object') {
      return jsonResponse({ error: 'Missing or invalid payload' }, 400);
    }

    // Whitelist models per endpoint to prevent quota abuse via arbitrary models.
    const CHAT_MODELS = new Set(['qwen/qwen3.6-27b']);
    const WHISPER_MODELS = new Set(['whisper-large-v3']);
    const EMBEDDING_MODELS = new Set(['text-embedding-3-small']);
    const MAX_AUDIO_BASE64 = 20 * 1024 * 1024; // ~15MB audio

    let url: string;
    let init: RequestInit;

    if (endpoint === 'embeddings') {
      if (!EMBEDDING_MODELS.has(payload.model)) {
        return jsonResponse({ error: 'Embedding model not allowed' }, 400);
      }
      // RAG query embeddings — routed to OpenAI (key stays server-side).
      if (!OPENAI_API_KEY) {
        return jsonResponse({ error: 'OPENAI_API_KEY not configured on server' }, 500);
      }
      url = `${OPENAI_BASE_URL}/embeddings`;
      init = {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      };
    } else if (endpoint === 'audio/transcriptions') {
      if (!WHISPER_MODELS.has(payload.model)) {
        return jsonResponse({ error: 'Transcription model not allowed' }, 400);
      }
      if (audioBase64 && audioBase64.length > MAX_AUDIO_BASE64) {
        return jsonResponse({ error: 'Audio file too large' }, 413);
      }
      if (!audioBase64) {
        return jsonResponse({ error: 'Missing audio data' }, 400);
      }
      // Whisper needs multipart/form-data with the real audio bytes.
      url = `${GROQ_BASE_URL}/audio/transcriptions`;
      const form = new FormData();
      form.append(
        'file',
        new Blob([base64ToBytes(audioBase64)], { type: audioMime ?? 'audio/m4a' }),
        audioName ?? 'recording.m4a'
      );
      for (const key of ['model', 'language', 'prompt', 'temperature', 'response_format']) {
        if (payload[key] !== undefined) {
          form.append(key, String(payload[key]));
        }
      }
      init = { method: 'POST', headers: { Authorization: `Bearer ${GROQ_API_KEY}` }, body: form };
    } else {
      // chat/completions
      if (!CHAT_MODELS.has(payload.model)) {
        return jsonResponse({ error: 'Chat model not allowed' }, 400);
      }
      url = `${GROQ_BASE_URL}/chat/completions`;
      init = {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      };
    }

    const response = await fetch(url, init);
    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch {
    // Do not leak internal error details to the client.
    return jsonResponse({ error: 'Proxy request failed' }, 500);
  }
});

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
