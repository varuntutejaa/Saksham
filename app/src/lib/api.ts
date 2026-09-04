import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Resolve the backend base URL.
 *  - Set EXPO_PUBLIC_API_URL for a deployed server (recommended for demos on real devices).
 *  - Otherwise we derive the LAN host from the Expo dev server so a phone on the
 *    same Wi-Fi can reach the API running on your laptop.
 */
function resolveBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');

  const hostUri =
    Constants.expoConfig?.hostUri ??
    (Constants as { manifest2?: { extra?: { expoClient?: { hostUri?: string } } } }).manifest2
      ?.extra?.expoClient?.hostUri;
  const host = hostUri?.split(':')[0];
  if (host && Platform.OS !== 'web') return `http://${host}:4000`;

  return 'http://localhost:4000';
}

export const API_BASE = resolveBaseUrl();

export type LanguageCode =
  | 'hi' | 'en' | 'bn' | 'ta' | 'te' | 'mr' | 'kn' | 'gu' | 'pa' | 'or';

export interface NsqfMapping {
  rawSkillText: string;
  normalizedSkill: string;
  nsqfQualificationId: string | null;
  qpCode: string | null;
  title: string | null;
  sector: string | null;
  nsqfLevel: number | null;
  confidence: number;
  method: string;
}

export interface ProgramRecommendation {
  recommendationId?: string;
  trainingProgramId: string;
  name: string;
  nameHindi: string | null;
  scheme: string;
  component: string | null;
  sector: string | null;
  nsqfLevel: number | null;
  mode: string;
  durationWeeks: number | null;
  stipend: boolean;
  district: string | null;
  state: string | null;
  contactPhone: string | null;
  seatsAvailable: number | null;
  score: number;
  rationale: string;
}

export interface ConverseResponse {
  sessionId: string;
  transcript: string;
  stt?: { provider: string; confidence: number };
  mappings: NsqfMapping[];
  recommendations: ProgramRecommendation[];
  reply: { text: string; audioUrl: string; format: string };
}

interface ConverseInput {
  transcript?: string;
  audioUri?: string;
  language: LanguageCode;
  state?: string;
  district?: string;
  userId?: string;
  channel?: 'APP' | 'WEB' | 'IVR';
  bandwidthKbps?: number;
}

export async function converse(input: ConverseInput): Promise<ConverseResponse> {
  const form = new FormData();
  form.append('language', input.language);
  form.append('channel', input.channel ?? 'APP');
  if (input.transcript) form.append('transcript', input.transcript);
  if (input.state) form.append('state', input.state);
  if (input.district) form.append('district', input.district);
  if (input.userId) form.append('userId', input.userId);
  if (input.bandwidthKbps) form.append('bandwidthKbps', String(input.bandwidthKbps));
  if (input.audioUri) {
    // React Native's FormData accepts a { uri, name, type } file descriptor.
    form.append('audio', {
      uri: input.audioUri,
      name: 'speech.m4a',
      type: 'audio/m4a',
    } as unknown as Blob);
  }

  const res = await fetch(`${API_BASE}/api/assistant/converse`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) throw new Error(`Assistant error ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function setRecommendationStatus(id: string, status: string): Promise<void> {
  await fetch(`${API_BASE}/api/assistant/recommendations/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
}

export interface AuthUser {
  id: string;
  name: string | null;
  phone: string | null;
  role: 'BENEFICIARY' | 'ADMIN';
  language: LanguageCode;
}

interface AuthResponse {
  token: string;
  user: AuthUser;
}

export async function login(phone: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, password }),
  });
  if (!res.ok) throw new Error(await extractError(res, 'Invalid phone or password'));
  return res.json();
}

export async function register(input: {
  phone: string;
  password: string;
  name?: string;
  language: LanguageCode;
}): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...input, role: 'BENEFICIARY' }),
  });
  if (!res.ok) throw new Error(await extractError(res, 'Could not create account'));
  return res.json();
}

async function extractError(res: Response, fallback: string): Promise<string> {
  const body = await res.json().catch(() => null);
  const e = body?.error;
  return typeof e === 'string' ? e : fallback;
}

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health`);
    return res.ok;
  } catch {
    return false;
  }
}
