import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/src/types/supabase';

let _supabase: SupabaseClient<Database> | null = null;

/**
 * Creates a fetch wrapper with a generous timeout so Supabase Edge Function
 * cold starts and slow queries don't hit the browser's default 6 s limit.
 */
function createFetchWithTimeout(timeoutMs: number = 25_000): typeof fetch {
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(input, {
        ...init,
        signal: controller.signal,
      });
      return response;
    } finally {
      clearTimeout(timer);
    }
  };
}

function getSupabaseClient(): SupabaseClient<Database> | null {
  if (!_supabase) {
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return null;
    }

    _supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      global: {
        fetch: createFetchWithTimeout(25_000),
      },
    });
  }
  return _supabase;
}

/**
 * Returns the Supabase client instance.
 * Call this function instead of importing the client directly.
 * Returns null if credentials are not configured.
 */
export function getSupabase(): SupabaseClient<Database> | null {
  return getSupabaseClient();
}

export default getSupabase;
