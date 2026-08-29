import { getSupabase } from '@/src/lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/src/types/supabase';
export type { StoredMessage, Conversation } from './conversations.types';

type SupabaseFrom = ReturnType<SupabaseClient<Database>['from']>;

let db: any = null;

export async function initLocalDB(): Promise<void> {
  try {
    const SQLite = require('expo-sqlite');
    db = await SQLite.openDatabaseAsync('dentify-conversations.db');
    await db.execAsync(
      `CREATE TABLE IF NOT EXISTS conversations (id TEXT PRIMARY KEY, title TEXT NOT NULL, messages TEXT NOT NULL, started_at TEXT NOT NULL, last_updated TEXT NOT NULL);`
    );
  } catch (e) { console.warn('conversations: failed to init local DB', e); db = null; }
}

export async function saveConversationLocal(conv: any): Promise<void> {
  if (!db) return;
  try {
    await db.runAsync(
      `INSERT OR REPLACE INTO conversations (id, title, messages, started_at, last_updated) VALUES (?, ?, ?, ?, ?)`,
      conv.id, conv.title, JSON.stringify(conv.messages), conv.started_at, conv.last_updated
    );
  } catch (e) { console.warn('conversations: failed to save conversation locally', e); }
}

export async function getConversationsLocal(): Promise<any[]> {
  if (!db) return [];
  try {
    const rows = await db.getAllAsync(`SELECT * FROM conversations ORDER BY last_updated DESC`);
    return (rows as any[]).map((r: any) => ({ ...r, messages: JSON.parse(r.messages) }));
  } catch (e) { console.warn('conversations: failed to get conversations locally', e); return []; }
}

export async function deleteConversationLocal(id: string): Promise<void> {
  if (!db) return;
  try { await db.runAsync(`DELETE FROM conversations WHERE id = ?`, id); } catch (e) { console.warn('conversations: failed to delete conversation', e); }
}

export async function syncToSupabase(profileId: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const localConvs = await getConversationsLocal();
  for (const conv of localConvs) {
    try {
      await (supabase.from('ai_conversations') as unknown as SupabaseFrom)
        .upsert({ id: conv.id, profile_id: profileId, messages: conv.messages, started_at: conv.started_at, last_updated: conv.last_updated }, { onConflict: 'id' });
    } catch (e) {
      console.warn('conversations: failed to sync to Supabase', e);
    }
  }
}

export async function syncFromSupabase(profileId: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    const { data } = await (supabase.from('ai_conversations') as unknown as SupabaseFrom)
      .select('*').eq('profile_id', profileId).order('last_updated', { ascending: false });
    if (data) {
      for (const conv of data) {
        const messages = conv.messages ?? [];
        await saveConversationLocal({
          id: conv.id,
          title: Array.isArray(messages) && messages.length > 0 ? String(messages[0]?.content ?? '').slice(0, 60) || 'Conversación' : 'Conversación',
          messages,
          started_at: conv.started_at,
          last_updated: conv.last_updated,
        });
      }
    }
  } catch (e) { console.warn('conversations: failed to sync from Supabase', e); }
}
