/**
 * Denty-AI Agent — Supabase Edge Function
 *
 * Study assistant with agent capabilities on Google Gemini (Gemini 3.5 Flash Lite):
 *  - Verifies the user's JWT (reads only the user's own data via RLS).
 *  - Agent loop (max 3 iterations) with a whitelist of tools:
 *      retrieve_manuals → server-side RAG (OpenAI text-embedding-3-small + pgvector)
 *      web_search       → Grounding with Google Search (native Gemini, free quota)
 *      get_my_profile   → authenticated user's profile (curated summary)
 *      get_my_progress  → user's academic progress (curated summary)
 *  - Model fallback chain: when a model is rate-limited or errors, the request
 *    moves to the next model. The last model runs WITHOUT tools (degraded mode)
 *    so basic questions still get answered under heavy load.
 *  - Vision: images reach the model as image_url parts (base64).
 *  - Attachments: images → vision parts; files (PDF/DOCX/txt/...) → server-side
 *    text extraction appended to the last user message.
 *
 * POST /functions/v1/denty-agent
 * Body: { messages: [{ role, content }], attachments?: [{ name, mime, base64 }] }
 * Auth: Authorization: Bearer <session JWT>
 *
 * Response: { content: string, sources: [{ type, title, page?, url? }] }
 */

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import pako from 'npm:pako@2.1.0';
import JSZip from 'npm:jszip@3.10.1';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/openai';
const GEMINI_NATIVE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const OPENAI_BASE_URL = 'https://api.openai.com/v1';

// Primary → fallbacks. The last model runs without tools (degraded mode).
const MODEL_CHAIN = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemma-4-31b-it'];
// RAG embeddings: OpenAI 3-small (1536 dims), matching the clinical_manuals index.
const EMBEDDING_MODEL = 'text-embedding-3-small';

const MAX_ITERATIONS = 3;
const MAX_TOKENS = 700;
const MAX_BODY_BYTES = 10 * 1024 * 1024; // base64 images included

// ── Per-user rate limiting (best-effort; Edge Function instances are ephemeral) ──
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10;
const rateHits = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const entry = rateHits.get(userId);
  if (!entry || now >= entry.resetAt) {
    rateHits.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT_MAX;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const SYSTEM_PROMPT = `Eres Denty-AI, el asistente clínico inteligente de Dentify, una aplicación educativa para estudiantes de odontología (caso de estudio UNERG, Venezuela). Tu propósito es ayudar a ESTUDIAR y PRACTICAR el diagnóstico clínico odontológico.

REGLAS:
1. Responde SIEMPRE en español, de forma breve, clara y didáctica.
2. Limítate al área odontológica/estomatológica y su enseñanza. Si te preguntan algo fuera de tu dominio, rechaza con cortesía y redirige al estudio dental.
3. Fundamenta tus respuestas: usa la herramienta retrieve_manuals para consultar los manuales clínicos (fuente primaria) y menciónala. Cuando el usuario necesite información actual (guías, normativas, novedades), usa web_search. Cuando pregunte por su propio progreso, usa get_my_profile o get_my_progress.
4. No inventes citas, cifras ni estadísticas. Si la información es insuficiente, indícalo y sugiere qué buscar.
5. Puedes analizar las imágenes que el usuario adjunte (radiografías, fotografías clínicas, esquemas): describe lo observado con lenguaje clínico y prudente, señala las limitaciones y aclara que no sustituye la valoración profesional.
6. Seguridad y ética: nunca reveles datos de otros usuarios ni credenciales; solo información del propio usuario. No des diagnósticos definitivos ni recetas: orienta al estudio y recomienda acudir a un odontólogo para casos reales.
7. Formato: párrafos cortos y viñetas cuando ayuden. Cuando uses fuentes, menciónalas de forma natural (manual, web, o el progreso del usuario).`;

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function stripReasoningBlock(content: string): string {
  return content.replace(/\n?<think>[\s\S]*?<\/think>\n?/g, '').trim();
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// ── Attachment text extraction (PDF, DOCX, RTF, HTML, plain text) ──

const MAX_EXTRACTED_TEXT = 12_000;
const RAG_MATCH_COUNT = 3;
const MAX_CHUNK_CHARS = 700;
// Decompression-bomb guards for PDF/DOCX extraction.
const MAX_INFLATED_BYTES = 2 * 1024 * 1024;
const MAX_PDF_STREAMS = 200;
const MAX_STREAM_BYTES = 4 * 1024 * 1024;

function base64ToBytes(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

function decodeText(bytes: Uint8Array): string {
  const utf8 = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  const badCount = (utf8.match(/�/g) ?? []).length;
  if (badCount > Math.max(1, utf8.length / 50)) {
    return new TextDecoder('latin1').decode(bytes);
  }
  return utf8;
}

function inflateRawSafe(bytes: Uint8Array): Uint8Array | null {
  try {
    return pako.inflateRaw(bytes, { maxOutputLength: MAX_INFLATED_BYTES });
  } catch {
    return null;
  }
}

function indexOfBytes(haystack: Uint8Array, needle: Uint8Array, from = 0): number {
  outer: for (let i = from; i <= haystack.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) {
      if (haystack[i + j] !== needle[j]) continue outer;
    }
    return i;
  }
  return -1;
}

function unescapePdfText(s: string): string {
  return s
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\([()\\])/g, '$1')
    .replace(/\\[0-7]{1,3}/g, (m) => String.fromCharCode(parseInt(m.slice(1), 8)))
    .replace(/\\[a-zA-Z]+/g, '');
}

function collectPdfText(content: string, out: string[]): void {
  const re = /\((?:\\.|[^\\()])*\)|\[([\s\S]*?)\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    if (m[1] !== undefined) {
      const strRe = /\((?:\\.|[^\\()])*\)/g;
      let sm: RegExpExecArray | null;
      while ((sm = strRe.exec(m[1])) !== null) {
        out.push(unescapePdfText(sm[0].slice(1, -1)));
      }
    } else {
      out.push(unescapePdfText(m[0].slice(1, -1)));
    }
  }
}

function extractPdfText(bytes: Uint8Array): string {
  const chunks: string[] = [];
  const streamMarker = new TextEncoder().encode('stream');
  const endMarker = new TextEncoder().encode('endstream');
  let pos = 0;
  let streamCount = 0;
  while (pos < bytes.length && streamCount < MAX_PDF_STREAMS) {
    const s = indexOfBytes(bytes, streamMarker, pos);
    if (s === -1) break;
    let cs = s + streamMarker.length;
    if (bytes[cs] === 0x0d) cs++;
    if (bytes[cs] === 0x0a) cs++;
    const e = indexOfBytes(bytes, endMarker, cs);
    if (e === -1) break;
    const raw = bytes.slice(cs, e);
    if (raw.length > MAX_STREAM_BYTES) {
      // Suspiciously large compressed stream — skip it (bomb guard).
      pos = e + endMarker.length;
      continue;
    }
    const inflated = inflateRawSafe(raw) ?? raw;
    collectPdfText(decodeText(inflated), chunks);
    pos = e + endMarker.length;
    streamCount++;
  }
  return chunks.join(' ');
}

async function extractDocxText(bytes: Uint8Array): Promise<string> {
  const zip = await JSZip.loadAsync(bytes);
  const file = zip.file('word/document.xml');
  if (!file) return '';
  const xml = await file.async('string');
  const paras = xml.match(/<w:p[\s\S]*?<\/w:p>/g) ?? [];
  return paras
    .map((p) => {
      const runs = p.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g) ?? [];
      return runs
        .map((r) => r.replace(/<[^>]*>/g, ''))
        .join('')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');
    })
    .filter((s) => s.trim())
    .join('\n');
}

function extractRtfText(s: string): string {
  return s
    .replace(/\{\\\*?[^{}]*\}/g, '')
    .replace(/\\[a-z]+-?\d* ?/g, ' ')
    .replace(/[{}]/g, '')
    .replace(/\n{3,}/g, '\n\n');
}

function stripHtml(s: string): string {
  return s
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

async function extractAttachmentText(name: string, mime: string, base64: string): Promise<string> {
  let bytes: Uint8Array;
  try {
    bytes = base64ToBytes(base64);
  } catch {
    return '';
  }
  const lowerName = (name ?? '').toLowerCase();
  const lowerMime = (mime ?? '').toLowerCase();

  if (lowerMime === 'application/pdf' || lowerName.endsWith('.pdf')) {
    const text = extractPdfText(bytes).slice(0, MAX_EXTRACTED_TEXT);
    return text.trim()
      ? text
      : '[No se pudo extraer texto: el PDF parece estar escaneado o ser solo imágenes. Pide al usuario una captura de la página relevante.]';
  }
  if (lowerMime.includes('wordprocessingml') || lowerName.endsWith('.docx')) {
    try {
      return (await extractDocxText(bytes)).slice(0, MAX_EXTRACTED_TEXT);
    } catch {
      return '[No se pudo leer el archivo .docx.]';
    }
  }
  if (lowerMime.includes('msword') || lowerName.endsWith('.doc')) {
    return '[Los archivos .doc (Word antiguo) no se pueden leer directamente; pide una versión .docx o .txt.]';
  }
  if (lowerMime === 'text/rtf' || lowerName.endsWith('.rtf')) {
    return extractRtfText(decodeText(bytes)).slice(0, MAX_EXTRACTED_TEXT);
  }
  if (lowerMime.includes('html') || lowerName.endsWith('.html') || lowerName.endsWith('.htm')) {
    return stripHtml(decodeText(bytes)).slice(0, MAX_EXTRACTED_TEXT);
  }
  // text/plain, markdown, csv, json, xml y similares.
  return decodeText(bytes).slice(0, MAX_EXTRACTED_TEXT);
}

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'retrieve_manuals',
      description:
        'Busca en los manuales clínicos odontológicos de referencia (RAG con pgvector). Úsalo para fundamentar respuestas sobre odontología, operatoria, endodoncia, periodoncia, ortodoncia o anatomía dental.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Términos o pregunta a buscar en los manuales' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'web_search',
      description:
        'Busca en internet información actualizada (guías clínicas recientes, normativas, novedades). Úsalo solo cuando el usuario necesite información actual que no está en los manuales.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Consulta de búsqueda web' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_my_profile',
      description: 'Obtiene el perfil del usuario autenticado (nombre, rol, racha de estudio).',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_my_progress',
      description:
        'Obtiene el progreso académico del usuario autenticado: especialidades, niveles completados, XP acumulado e insignias obtenidas.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
];

interface AgentSource {
  type: 'manual' | 'web' | 'progress';
  title: string;
  page?: number;
  url?: string;
}

interface ToolResult {
  content: string;
  sources: AgentSource[];
}

// ── Gemini API helpers ─────────────────────────────────────────────────────

/**
 * POST to the OpenAI-compatible Gemini endpoint. Returns the parsed JSON and
 * the HTTP status so the caller can decide whether to fall back to another
 * model.
 */
async function callGeminiChat(
  model: string,
  payload: Record<string, unknown>
): Promise<{ data: any; status: number }> {
  const res = await fetch(`${GEMINI_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GEMINI_API_KEY}` },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  let data: any = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    // non-JSON error body — keep {}
  }
  return { data, status: res.status };
}

/**
 * Calls the model chain in order: on a rate limit it waits the suggested delay
 * and retries once; on other errors the request moves to the next model. The
 * last model runs WITHOUT tools so a basic answer can still be produced under
 * heavy load.
 */
async function chatWithFallback(
  messages: any[],
  tools: unknown[]
): Promise<{ message: any; model: string }> {
  let lastError = 'No model responded';
  for (let i = 0; i < MODEL_CHAIN.length; i++) {
    const model = MODEL_CHAIN[i];
    const withTools = i < MODEL_CHAIN.length - 1;
    const payload: Record<string, unknown> = {
      model,
      messages,
      temperature: 0.4,
      max_tokens: MAX_TOKENS,
    };
    if (withTools) {
      payload.tools = tools;
      payload.tool_choice = 'auto';
    }

    let status = 0;
    let data: any = {};
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await callGeminiChat(model, payload);
      status = res.status;
      data = res.data;
      const message = data?.choices?.[0]?.message;
      if (status === 200 && message) return { message, model };
      lastError = data?.error?.message ?? `HTTP ${status}`;
      // Rate limit: honor the suggested delay (capped) and retry once.
      if (status === 429 && attempt === 0) {
        const retryAfter = Number(data?.error?.details?.[0]?.metadata?.retry_delay?.seconds ?? 4);
        await sleep(Math.min(retryAfter, 20) * 1000);
      } else {
        break;
      }
    }

    // A model can reject the `tools` field with 400/404 — retry it plain.
    if (withTools && (status === 400 || status === 404)) {
      const { data: plain, status: plainStatus } = await callGeminiChat(model, {
        model,
        messages,
        temperature: 0.4,
        max_tokens: MAX_TOKENS,
      });
      const plainMessage = plain?.choices?.[0]?.message;
      if (plainStatus === 200 && plainMessage) return { message: plainMessage, model };
    }
  }
  throw new Error(lastError);
}

async function openaiEmbed(text: string): Promise<number[] | null> {
  if (!OPENAI_API_KEY) return null;
  try {
    const res = await fetch(`${OPENAI_BASE_URL}/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({ model: EMBEDDING_MODEL, input: text }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.data?.[0]?.embedding ?? null;
  } catch {
    return null;
  }
}

// ── Tools ────────────────────────────────────────────────────────────────

async function retrieveManuals(query: string, userClient: ReturnType<typeof createClient>): Promise<ToolResult> {
  const embedding = await openaiEmbed(query);
  if (embedding) {
    try {
      const { data, error } = await userClient.rpc('match_manuals', {
        query_embedding: JSON.stringify(embedding),
        match_count: RAG_MATCH_COUNT,
      });
      if (!error && Array.isArray(data) && data.length > 0) {
        const content = (data as any[])
          .map((c, i) => `[${i + 1}] ${String(c.content).slice(0, MAX_CHUNK_CHARS)}${c.source_document ? ` (Fuente: ${c.source_document}${c.page_number ? `, pág. ${c.page_number}` : ''})` : ''}`)
          .join('\n\n');
        return {
          content,
          sources: (data as any[]).map((c) => ({
            type: 'manual' as const,
            title: c.source_document ?? c.title ?? 'Manual clínico',
            page: c.page_number ?? undefined,
          })),
        };
      }
    } catch {
      // fall through to lexical search
    }
  }

  // Lexical fallback (pg_trgm)
  try {
    const terms = query
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 3)
      .slice(0, 5)
      .join(' ');
    const { data } = await userClient.rpc('match_manuals_by_text', {
      search_query: terms || query,
      match_count: RAG_MATCH_COUNT,
    });
    const rows = Array.isArray(data) ? data : [];
    if (rows.length > 0) {
      const content = (rows as any[])
        .map((c, i) => `[${i + 1}] ${String(c.content).slice(0, MAX_CHUNK_CHARS)}${c.source_document ? ` (Fuente: ${c.source_document}${c.page_number ? `, pág. ${c.page_number}` : ''})` : ''}`)
        .join('\n\n');
      return {
        content,
        sources: (rows as any[]).map((c) => ({
          type: 'manual' as const,
          title: c.source_document ?? c.title ?? 'Manual clínico',
          page: c.page_number ?? undefined,
        })),
      };
    }
  } catch {
    // no results
  }

  return { content: 'No se encontraron fragmentos relevantes en los manuales.', sources: [] };
}

/**
 * Web search via native Gemini Grounding with Google Search (free quota of
 * 5,000 searches/month). Returns the grounded answer text plus the cited web
 * sources so the app can show source chips.
 */
async function webSearch(query: string): Promise<ToolResult> {
  try {
    const res = await fetch(
      `${GEMINI_NATIVE_URL}/models/gemini-3.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: query }] }],
          tools: [{ googleSearch: {} }],
          generationConfig: { temperature: 0 },
        }),
      }
    );
    if (!res.ok) return { content: 'Búsqueda web no disponible en este momento.', sources: [] };

    const data = await res.json();
    const candidate = data?.candidates?.[0];
    const text =
      (candidate?.content?.parts as any[] | undefined)?.map((p: any) => p.text ?? '').filter(Boolean).join('\n') ?? '';

    const grounding = candidate?.groundingMetadata ?? {};
    const sources: AgentSource[] = [];
    const seen = new Set<string>();
    for (const chunk of Array.isArray(grounding.groundingChunks) ? grounding.groundingChunks : []) {
      const uri = chunk?.web?.uri;
      if (uri && !seen.has(uri)) {
        seen.add(uri);
        sources.push({ type: 'web', title: chunk.web.title ?? uri, url: uri });
      }
    }
    for (const src of Array.isArray(grounding.groundingSources) ? grounding.groundingSources : []) {
      const uri = src?.uri;
      if (uri && !seen.has(uri)) {
        seen.add(uri);
        sources.push({ type: 'web', title: uri, url: uri });
      }
    }

    if (!text.trim()) return { content: 'No se encontraron resultados web para esa consulta.', sources };
    return { content: text, sources };
  } catch {
    return { content: 'Búsqueda web no disponible en este momento.', sources: [] };
  }
}

async function getMyProfile(userId: string, userClient: ReturnType<typeof createClient>): Promise<ToolResult> {
  const { data } = await userClient
    .from('profiles')
    .select('full_name, role, streak_count, avatar_color')
    .eq('id', userId)
    .maybeSingle();
  const profile = data as { full_name?: string | null; role?: string | null; streak_count?: number | null } | null;
  const summary = profile
    ? `Nombre: ${profile.full_name ?? 'Sin nombre'} | Rol: ${profile.role ?? 'estudiante'} | Racha de estudio: ${profile.streak_count ?? 0} día(s).`
    : 'El usuario no tiene un perfil completo configurado.';
  return {
    content: summary,
    sources: [{ type: 'progress', title: 'Perfil del usuario' }],
  };
}

async function getMyProgress(userId: string, userClient: ReturnType<typeof createClient>): Promise<ToolResult> {
  const [{ data: progress }, { data: userBadges }, { data: defs }, { data: levels }] = await Promise.all([
    userClient.from('pedagogical_progress').select('specialty, level, status').eq('profile_id', userId),
    userClient.from('user_badges').select('badge_id').eq('profile_id', userId),
    userClient.from('specialties').select('id, name, slug, levels_count'),
    userClient.from('levels').select('specialty_id, level_number, xp_reward'),
  ]);

  const specialties = (defs ?? []) as { id: string; name: string; slug: string; levels_count: number }[];
  const levelsRows = (levels ?? []) as { specialty_id: string; level_number: number; xp_reward: number }[];
  const progressRows = (progress ?? []) as { specialty: string; level: number; status: string }[];
  const badgesCount = (userBadges ?? []).length;

  const xp = progressRows
    .filter((p) => p.status === 'completed')
    .reduce((sum, p) => {
      const spec = specialties.find((s) => s.name === p.specialty || s.slug === p.specialty);
      if (!spec) return sum;
      const lvl = levelsRows.find((l) => l.specialty_id === spec.id && l.level_number === p.level);
      return sum + (lvl?.xp_reward ?? 0);
    }, 0);

  const perSpecialty = specialties.map((s) => {
    const done = progressRows.filter((p) => p.status === 'completed' && (p.specialty === s.name || p.specialty === s.slug)).length;
    return `${s.name}: ${done}/${s.levels_count} niveles`;
  });

  const completedLevels = progressRows.filter((p) => p.status === 'completed');
  const summary = [
    `Niveles completados: ${completedLevels.length}`,
    `XP acumulado: ${xp}`,
    `Insignias obtenidas: ${badgesCount}`,
    `Por especialidad: ${perSpecialty.join(' · ')}`,
  ].join('\n');

  return {
    content: summary,
    sources: [{ type: 'progress', title: 'Progreso del usuario' }],
  };
}

async function executeTool(name: string, args: any, userId: string, userClient: ReturnType<typeof createClient>): Promise<ToolResult> {
  switch (name) {
    case 'retrieve_manuals':
      return retrieveManuals(String(args?.query ?? ''), userClient);
    case 'web_search':
      return webSearch(String(args?.query ?? ''));
    case 'get_my_profile':
      return getMyProfile(userId, userClient);
    case 'get_my_progress':
      return getMyProgress(userId, userClient);
    default:
      return { content: `Herramienta desconocida: ${name}`, sources: [] };
  }
}

// ── Handler ──────────────────────────────────────────────────────────────

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
    const userId = user.id;
    if (isRateLimited(userId)) {
      return jsonResponse({ error: 'Demasiadas solicitudes. Espera un momento y vuelve a intentarlo.' }, 429);
    }

    const body = await req.json().catch(() => null);
    if (!body || !Array.isArray(body.messages) || body.messages.length === 0) {
      return jsonResponse({ error: 'Missing messages array' }, 400);
    }

    const bodySize = new TextEncoder().encode(JSON.stringify(body)).length;
    if (bodySize > MAX_BODY_BYTES) {
      return jsonResponse({ error: 'Body too large (image too big). Sube una imagen más pequeña.' }, 413);
    }

    // User-JWT client: RLS guarantees it only reads the user's own data.
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    let messages: any[] = [...body.messages];
    const sources: AgentSource[] = [];
    const toolContexts: string[] = [];
    let finalContent = '';

    // Process attachments: images → vision parts; files → extracted text.
    const attachments = Array.isArray(body.attachments) ? body.attachments : [];
    if (attachments.length > 0) {
      const lastUserIndex = messages.map((m) => m.role).lastIndexOf('user');
      if (lastUserIndex === -1) {
        return jsonResponse({ error: 'Escribe un mensaje junto al archivo adjunto.' }, 400);
      }
      const userMsg = messages[lastUserIndex];
      const baseText = typeof userMsg.content === 'string' ? userMsg.content : '';
      const fileTexts: string[] = [];
      const imageParts: { type: 'image_url'; image_url: { url: string } }[] = [];

      for (const att of attachments) {
        if (!att || typeof att !== 'object') continue;
        const mime = String(att.mime ?? '').toLowerCase();
        if (mime.startsWith('image/')) {
          imageParts.push({
            type: 'image_url',
            image_url: { url: `data:${mime};base64,${String(att.base64 ?? '')}` },
          });
        } else {
          const text = await extractAttachmentText(String(att.name ?? ''), mime, String(att.base64 ?? ''));
          if (text.trim()) {
            fileTexts.push(`[Archivo: ${att.name ?? 'adjunto'}]\n${text}`);
          }
        }
      }

      const combinedText = [baseText, ...fileTexts].filter(Boolean).join('\n\n');
      messages[lastUserIndex] = {
        ...userMsg,
        content: imageParts.length > 0
          ? [{ type: 'text', text: combinedText }, ...imageParts]
          : combinedText,
      };
    }

    for (let i = 0; i < MAX_ITERATIONS; i++) {
      const { message } = await chatWithFallback([{ role: 'system', content: SYSTEM_PROMPT }, ...messages], TOOLS);
      messages.push(message);

      const toolCalls = Array.isArray(message.tool_calls) ? message.tool_calls : [];
      if (toolCalls.length === 0) {
        finalContent = stripReasoningBlock(message.content ?? '');
        break;
      }

      for (const tc of toolCalls) {
        let args: any = {};
        try {
          args = tc.function?.arguments ? JSON.parse(tc.function.arguments) : {};
        } catch {
          args = {};
        }
        const result = await executeTool(tc.function?.name ?? '', args, userId, userClient);
        sources.push(...result.sources);
        if (result.content.trim()) toolContexts.push(result.content);
        messages.push({ role: 'tool', tool_call_id: tc.id, content: result.content });
      }
    }

    // If the loop ended without an answer (tool-call exhaustion, rate limits, or
    // a degraded model that returned empty), answer once more with a plain
    // completion grounded on the tool results — the user always gets a response.
    if (!finalContent) {
      const contextBlock = toolContexts.length > 0
        ? `\n\n## Contexto de herramientas\n${toolContexts.join('\n\n')}`
        : '';
      const cleanMessages = messages.filter(
        (m) =>
          m.role !== 'tool' &&
          !(m.role === 'assistant' && Array.isArray(m.tool_calls) && m.tool_calls.length > 0)
      );
      const lastUserIndex = cleanMessages.map((m) => m.role).lastIndexOf('user');
      if (lastUserIndex >= 0) {
        const lastUser = cleanMessages[lastUserIndex];
        const augmentedUser =
          typeof lastUser.content === 'string'
            ? { role: 'user', content: lastUser.content + contextBlock }
            : lastUser;
        const history = [
          { role: 'system', content: SYSTEM_PROMPT },
          ...cleanMessages.slice(0, lastUserIndex),
          augmentedUser,
        ];
        try {
          const { message } = await chatWithFallback(history, []);
          finalContent = stripReasoningBlock(message.content ?? '');
        } catch {
          // keep the friendly fallback below
        }
      }
    }

    if (!finalContent) {
      finalContent = 'No pude completar la respuesta. Intenta reformular tu pregunta.';
    }

    return jsonResponse({ content: finalContent, sources }, 200);
  } catch (err) {
    console.error('denty-agent error', err);
    const msg = err instanceof Error ? err.message : String(err);
    const rateLimited = /429|rate limit|RESOURCE_EXHAUSTED/i.test(msg);
    return jsonResponse(
      { error: rateLimited ? 'El asistente está muy solicitado en este momento. Intenta de nuevo en unos segundos.' : 'Proxy request failed' },
      rateLimited ? 429 : 500
    );
  }
});
