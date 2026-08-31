/**
 * agent — client for the `denty-agent` Edge Function (tool-using assistant).
 *
 * Messages may carry text and/or images (image_url parts in base64) that the
 * multimodal Gemini model processes directly. The function returns the final
 * answer plus the sources used (manuals, web, or the user's progress).
 */

import { getSupabase } from '@/src/lib/supabase';

export type AgentContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

export interface AgentMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | AgentContentPart[];
  tool_call_id?: string;
  name?: string;
}

export interface AgentSource {
  type: 'manual' | 'web' | 'progress';
  title: string;
  page?: number;
  url?: string;
}

export interface AgentResponse {
  content: string;
  sources: AgentSource[];
}

/** Attachment uploaded to the Edge Function (image or file to extract). */
export interface AgentAttachment {
  name: string;
  mime: string;
  base64: string;
}

const FETCH_TIMEOUT_MS = 60_000;

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new Error('El asistente está tardando en responder. Intenta de nuevo en unos segundos.');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function getAgentUrl(): string {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  if (supabaseUrl) return `${supabaseUrl}/functions/v1/denty-agent`;
  return 'http://localhost:54321/functions/v1/denty-agent';
}

/**
 * Sends the history (text + attachments) to the agent assistant.
 * The session JWT lets the server read ONLY the user's own data.
 */
export async function sendAgentMessage(
  messages: AgentMessage[],
  attachments?: AgentAttachment[]
): Promise<AgentResponse> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Sin conexión con Supabase');
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Sesión no iniciada');

  const response = await fetchWithTimeout(getAgentUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ messages, attachments }),
  });

  if (!response.ok) {
    let message = `El asistente no pudo responder (${response.status}).`;
    try {
      const body = await response.json();
      if (body?.error) message = body.error;
    } catch {
      // keep the default message
    }
    throw new Error(message);
  }

  const data = await response.json();
  return {
    content: typeof data?.content === 'string' ? data.content : '',
    sources: Array.isArray(data?.sources) ? (data.sources as AgentSource[]) : [],
  };
}
