import { Platform } from 'react-native';
import { getSupabase } from '@/src/lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/src/types/supabase';
export type { StoredMessage, Conversation } from './conversations.types';

type SupabaseFrom = ReturnType<SupabaseClient<Database>['from']>;

const memoryStore: any[] = [];
let db: any = null; // will use memory on web

export async function initLocalDB(): Promise<void> {
  // Web: in-memory only
}

export async function saveConversationLocal(conv: any): Promise<void> {
  const idx = memoryStore.findIndex(c => c.id === conv.id);
  if (idx >= 0) memoryStore[idx] = conv;
  else memoryStore.push(conv);
}

export async function getConversationsLocal(): Promise<any[]> {
  return [...memoryStore].sort((a, b) => 
    new Date(b.last_updated).getTime() - new Date(a.last_updated).getTime()
  );
}

export async function deleteConversationLocal(id: string): Promise<void> {
  const idx = memoryStore.findIndex(c => c.id === id);
  if (idx >= 0) memoryStore.splice(idx, 1);
}

export async function syncToSupabase(profileId: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  for (const conv of memoryStore) {
    await (supabase.from('ai_conversations') as unknown as SupabaseFrom).upsert(
      { id: conv.id, profile_id: profileId, messages: conv.messages, started_at: conv.started_at, last_updated: conv.last_updated },
      { onConflict: 'id' }
    ).catch((e: unknown) => { console.warn('conversations: failed to sync to Supabase', e); });
  }
}

export async function syncFromSupabase(profileId: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const { data } = await (supabase.from('ai_conversations') as unknown as SupabaseFrom).select('*').eq('profile_id', profileId).order('last_updated', { ascending: false }).catch((e: unknown) => { console.warn('conversations: failed to sync from Supabase', e); return { data: null }; });
  if (data) {
    for (const conv of data) {
      saveConversationLocal(conv);
    }
  }
}
