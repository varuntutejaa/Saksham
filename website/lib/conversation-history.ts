"use client";

export interface HistoryMessage {
  role: "user" | "assistant";
  text: string;
}

export interface ConversationRecord {
  id: string;
  title: string;
  timestamp: number;
  messages: HistoryMessage[];
}

const KEY = "saksham.web.speakHistory.v1";
const MAX_STORED = 20;

function titleFrom(text: string): string {
  const clean = text.trim().replace(/\s+/g, " ");
  return clean.length > 48 ? `${clean.slice(0, 48)}…` : clean;
}

export function loadHistory(): ConversationRecord[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveConversation(id: string, messages: HistoryMessage[]): ConversationRecord[] {
  const firstUserMessage = messages.find((m) => m.role === "user");
  const record: ConversationRecord = {
    id,
    title: firstUserMessage ? titleFrom(firstUserMessage.text) : "…",
    timestamp: Date.now(),
    messages,
  };
  try {
    const list = loadHistory();
    const idx = list.findIndex((r) => r.id === id);
    if (idx >= 0) list.splice(idx, 1);
    list.unshift(record);
    const trimmed = list.slice(0, MAX_STORED);
    localStorage.setItem(KEY, JSON.stringify(trimmed));
    return trimmed;
  } catch {
    return [record];
  }
}
