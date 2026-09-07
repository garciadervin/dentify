import { getSupabase } from '@/src/lib/supabase';
import type { Conversation, StoredMessage } from './conversations.types';
import type { Json } from '@/src/types/supabase';
export type { StoredMessage, Conversation } from './conversations.types';

// Web has no persistent local store: keep an in-memory copy so the chat works
// in a browser tab. Supabase is the source of truth (synced on load/save).
const memoryStore: Conversation[] = [];

export async function initLocalDB(): Promise<void> {
  // no-op on web (memory only)
}

export async function saveConversationLocal(conv: Conversation): Promise<void> {
  const idx = memoryStore.findIndex((c) => c.id === conv.id);
  if (idx >= 0) memoryStore[idx] = conv;
  else memoryStore.push(conv);
}

export async function getConversationsLocal(): Promise<Conversation[]> {
  return [...memoryStore].sort(
    (a, b) => new Date(b.last_updated).getTime() - new Date(a.last_updated).getTime()
  );
}

export async function deleteConversationLocal(id: string): Promise<void> {
  const idx = memoryStore.findIndex((c) => c.id === id);
  if (idx >= 0) memoryStore.splice(idx, 1);
}

export async function syncToSupabase(profileId: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  for (const conv of memoryStore) {
    try {
      await supabase.from('ai_conversations').upsert(
        {
          id: conv.id,
          profile_id: profileId,
          messages: conv.messages as unknown as Json,
          started_at: conv.started_at,
          last_updated: conv.last_updated,
        },
        { onConflict: 'id' }
      );
    } catch (e) {
      console.warn('conversations: failed to sync to Supabase', e);
    }
  }
}

export async function syncFromSupabase(profileId: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    const { data } = await supabase
      .from('ai_conversations')
      .select('*')
      .eq('profile_id', profileId)
      .order('last_updated', { ascending: false });
    for (const conv of data ?? []) {
      const messages = conv.messages as unknown as StoredMessage[];
      saveConversationLocal({
        id: conv.id,
        title:
          Array.isArray(messages) && messages.length > 0
            ? String(messages[0]?.content ?? '').slice(0, 60) || 'Conversación'
            : 'Conversación',
        messages: Array.isArray(messages) ? messages : [],
        started_at: conv.started_at,
        last_updated: conv.last_updated,
      });
    }
  } catch (e) {
    console.warn('conversations: failed to sync from Supabase', e);
  }
}
