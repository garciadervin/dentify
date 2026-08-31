/**
 * Denty-Transcribe — Supabase Edge Function
 *
 * Transcribes a short voice recording (chat dictation) using the multimodal
 * Gemini 3.5 Flash Lite model, removing the dependency on a separate
 * speech-to-text provider. Runs on the same free tier as denty-agent.
 *
 * POST /functions/v1/denty-transcribe
 * Body: { audioBase64: string, audioName?: string, audioMime?: string }
 * Auth: Authorization: Bearer <session JWT>
 *
 * Response: { text: string }
 */

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

const MODEL = 'gemini-3.5-flash-lite';
const MAX_BODY_BYTES = 12 * 1024 * 1024; // a few minutes of audio base64

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const TRANSCRIBE_PROMPT =
  'Transcribe el audio en español, literalmente (verbatim). ' +
  'Devuelve únicamente el texto transcrito, sin comentarios ni puntuación añadida.';

// Normalize container MIME types Gemini understands (m4a = mp4 container).
function normalizeMime(mime: string): string {
  const m = (mime ?? '').toLowerCase();
  if (!m) return 'audio/mp4';
  if (m === 'audio/m4a') return 'audio/mp4';
  if (m === 'audio/x-m4a') return 'audio/mp4';
  return m;
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (!GEMINI_API_KEY) return jsonResponse({ error: 'GEMINI_API_KEY not configured on server' }, 500);
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return jsonResponse({ error: 'Supabase not configured on server' }, 500);
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  const jwt = authHeader.replace(/^Bearer\s+/i, '');
  if (!jwt) return jsonResponse({ error: 'Missing Authorization header' }, 401);

  try {
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: { user }, error: userError } = await authClient.auth.getUser(jwt);
    if (userError || !user?.id) return jsonResponse({ error: 'Invalid session' }, 401);

    const body = await req.json().catch(() => null);
    if (!body || typeof body.audioBase64 !== 'string' || body.audioBase64.length === 0) {
      return jsonResponse({ error: 'Missing audioBase64' }, 400);
    }

    const bodySize = new TextEncoder().encode(JSON.stringify(body)).length;
    if (bodySize > MAX_BODY_BYTES) {
      return jsonResponse({ error: 'Audio demasiado grande. Graba un mensaje más corto.' }, 413);
    }

    const mime = normalizeMime(body.audioMime);
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: TRANSCRIBE_PROMPT },
                { inline_data: { mime_type: mime, data: body.audioBase64 } },
              ],
            },
          ],
        }),
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = err?.error?.message ?? `HTTP ${res.status}`;
      const rateLimited = /429|rate limit|RESOURCE_EXHAUSTED/i.test(msg);
      return jsonResponse(
        { error: rateLimited ? 'La transcripción está saturada. Intenta en unos segundos.' : `Transcripción no disponible: ${msg}` },
        rateLimited ? 429 : 502
      );
    }

    const data = await res.json();
    const parts = data?.candidates?.[0]?.content?.parts;
    const text =
      (Array.isArray(parts) ? parts.map((p: any) => p.text ?? '').filter(Boolean).join(' ') : '').trim();

    if (!text) return jsonResponse({ text: '' }, 200);
    return jsonResponse({ text }, 200);
  } catch (err) {
    console.error('denty-transcribe error', err);
    return jsonResponse({ error: 'Transcripción no disponible' }, 500);
  }
});
