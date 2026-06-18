export interface StoredMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: StoredMessage[];
  started_at: string;
  last_updated: string;
}
