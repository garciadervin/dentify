import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/src/types/supabase';

let _supabase: SupabaseClient<Database> | null = null;

function getSupabaseClient(): SupabaseClient<Database> | null {
  if (!_supabase) {
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return null;
    }

    _supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
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
