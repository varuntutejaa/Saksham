import AsyncStorage from '@react-native-async-storage/async-storage';

export interface HistoryMessage {
  role: 'user' | 'assistant';
  text: string;
}

export interface ConversationRecord {
  id: string;
  title: string;
  timestamp: number;
  messages: HistoryMessage[];
}

const KEY = 'saksham.speakHistory.v1';
const MAX_STORED = 20;

function titleFrom(text: string): string {
  const clean = text.trim().replace(/\s+/g, ' ');
  return clean.length > 48 ? `${clean.slice(0, 48)}…` : clean;
}

export async function loadHistory(): Promise<ConversationRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Insert or update a conversation record (by id) and persist, most-recent-first. */
export async function saveConversation(id: string, messages: HistoryMessage[]): Promise<ConversationRecord[]> {
  const firstUserMessage = messages.find((m) => m.role === 'user');
  const record: ConversationRecord = {
    id,
    title: firstUserMessage ? titleFrom(firstUserMessage.text) : '…',
    timestamp: Date.now(),
    messages,
  };
  try {
    const list = await loadHistory();
    const idx = list.findIndex((r) => r.id === id);
    if (idx >= 0) list.splice(idx, 1);
    list.unshift(record);
    const trimmed = list.slice(0, MAX_STORED);
    await AsyncStorage.setItem(KEY, JSON.stringify(trimmed));
    return trimmed;
  } catch {
    return [record];
  }
}
