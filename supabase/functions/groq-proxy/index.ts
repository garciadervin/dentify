/**
 * Groq API Proxy — Supabase Edge Function
 *
 * Proxies requests to Groq API so the API key stays server-side.
 * The client never sees the Groq API key.
 *
 * POST /functions/v1/groq-proxy
 * Body: { endpoint: "chat/completions" | "audio/transcriptions", payload: object }
 */

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';

const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';

serve(async (req) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

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
    const { endpoint, payload } = await req.json();

    if (!endpoint || !payload) {
      return new Response(
        JSON.stringify({ error: 'Missing endpoint or payload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = `${GROQ_BASE_URL}/${endpoint}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
