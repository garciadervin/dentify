/**
 * voice — client for the `denty-transcribe` Edge Function.
 *
 * Reads the recorded audio file as base64 and asks the server-side Gemini
 * model to transcribe it, so the STT key stays server-side.
 */

import { File } from 'expo-file-system';
import { getSupabase } from '@/src/lib/supabase';

const FETCH_TIMEOUT_MS = 30_000;

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new Error('La transcripción tardó demasiado. Intenta de nuevo en unos segundos.');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function getTranscribeUrl(): string {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  if (supabaseUrl) return `${supabaseUrl}/functions/v1/denty-transcribe`;
  return 'http://localhost:54321/functions/v1/denty-transcribe';
}

function mimeFromName(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  switch (ext) {
    case 'wav':
      return 'audio/wav';
    case 'mp3':
      return 'audio/mpeg';
    case 'aac':
      return 'audio/aac';
    case 'ogg':
      return 'audio/ogg';
    case 'flac':
      return 'audio/flac';
    case 'mp4':
      return 'audio/mp4';
    case 'm4a':
      return 'audio/m4a';
    case 'caf':
      return 'audio/x-caf';
    default:
      return 'audio/m4a';
  }
}

/**
 * Transcribes a recorded voice memo via `denty-transcribe`.
 * The session JWT lets the server verify the caller; the Gemini key never
 * leaves Supabase.
 */
export async function transcribeAudio(audioUri: string): Promise<string> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Sin conexión con Supabase');
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Sesión no iniciada');

  let audioBase64 = '';
  try {
    const audioFile = new File(audioUri);
    audioBase64 = await audioFile.base64();
  } catch {
    throw new Error('No se pudo leer la grabación de audio.');
  }
  if (!audioBase64) throw new Error('No se pudo leer la grabación de audio.');

  const audioName = audioUri.split('/').pop() ?? 'recording.m4a';

  const response = await fetchWithTimeout(getTranscribeUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ audioBase64, audioName, audioMime: mimeFromName(audioName) }),
  });

  if (!response.ok) {
    let message = 'No se pudo transcribir el audio.';
    try {
      const body = await response.json();
      if (body?.error) message = body.error;
    } catch {
      // keep the default message
    }
    throw new Error(message);
  }

  const data = await response.json();
  return typeof data?.text === 'string' ? data.text : '';
}
