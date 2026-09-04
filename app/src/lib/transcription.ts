import { Platform } from 'react-native';

import { API_BASE, type LanguageCode } from '@/lib/api';

const SARVAM_STT_URL = 'https://api.sarvam.ai/speech-to-text';

const SARVAM_LANGUAGE_CODES: Record<LanguageCode, string> = {
  en: 'en-IN',
  hi: 'hi-IN',
  bn: 'bn-IN',
  ta: 'ta-IN',
  te: 'te-IN',
  mr: 'mr-IN',
  kn: 'kn-IN',
  gu: 'gu-IN',
  pa: 'pa-IN',
  or: 'od-IN',
};

interface SarvamTranscriptionResponse {
  transcript?: string;
  language_code?: string | null;
  language?: LanguageCode | null;
  languageCode?: LanguageCode | null;
  language_probability?: number | null;
  languageProbability?: number | null;
}

export interface TranscriptionResult {
  transcript: string;
  languageCode: LanguageCode | null;
  languageProbability: number | null;
}

function audioMimeType(uri: string): string {
  const lower = uri.toLowerCase();
  if (lower.includes('.webm') || lower.startsWith('blob:')) return 'audio/webm';
  if (lower.includes('.mp3')) return 'audio/mpeg';
  if (lower.includes('.wav')) return 'audio/wav';
  if (lower.includes('.aac')) return 'audio/aac';
  return 'audio/x-m4a';
}

function audioFileName(uri: string): string {
  const type = audioMimeType(uri);
  if (type === 'audio/webm') return 'speech.webm';
  if (type === 'audio/mpeg') return 'speech.mp3';
  if (type === 'audio/wav') return 'speech.wav';
  if (type === 'audio/aac') return 'speech.aac';
  return 'speech.m4a';
}

async function appendAudio(form: FormData, audioUri: string) {
  const type = audioMimeType(audioUri);
  const name = audioFileName(audioUri);

  if (Platform.OS === 'web') {
    const audio = await fetch(audioUri);
    const blob = await audio.blob();
    form.append('file', blob, name);
    return;
  }

  form.append('file', { uri: audioUri, name, type } as unknown as Blob);
}

async function appendServerAudio(form: FormData, audioUri: string) {
  const type = audioMimeType(audioUri);
  const name = audioFileName(audioUri);

  if (Platform.OS === 'web') {
    const audio = await fetch(audioUri);
    const blob = await audio.blob();
    form.append('audio', blob, name);
    return;
  }

  form.append('audio', { uri: audioUri, name, type } as unknown as Blob);
}

function languageFromSpeechCode(code: string | null | undefined): LanguageCode | null {
  if (!code) return null;
  const exact = code as LanguageCode;
  if (exact in SARVAM_LANGUAGE_CODES) return exact;
  const normalized = Object.entries(SARVAM_LANGUAGE_CODES).find(([, sarvamCode]) => sarvamCode === code)?.[0];
  return (normalized as LanguageCode | undefined) ?? null;
}

export function hasSarvamApiKey(): boolean {
  return Boolean(process.env.EXPO_PUBLIC_SARVAM_API_KEY?.trim());
}

export async function transcribeWithSarvam(
  audioUri: string,
  language: LanguageCode,
): Promise<TranscriptionResult> {
  try {
    const form = new FormData();
    await appendServerAudio(form, audioUri);
    form.append('language', language);
    form.append('autoDetectLanguage', 'true');

    const res = await fetch(`${API_BASE}/api/assistant/transcribe`, {
      method: 'POST',
      body: form,
    });

    if (!res.ok) throw new Error(`Server transcription failed ${res.status}: ${await res.text()}`);
    const body = (await res.json()) as SarvamTranscriptionResponse;
    const transcript = body.transcript?.trim();
    if (!transcript) throw new Error('Server returned an empty transcript');

    return {
      transcript,
      languageCode: languageFromSpeechCode(body.languageCode ?? body.language ?? body.language_code),
      languageProbability: body.languageProbability ?? body.language_probability ?? null,
    };
  } catch {
    // Local development fallback: keep the demo usable even if the API server is down.
  }

  const apiKey = process.env.EXPO_PUBLIC_SARVAM_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('Assistant server is unavailable and EXPO_PUBLIC_SARVAM_API_KEY is missing in app/.env');
  }

  const form = new FormData();
  await appendAudio(form, audioUri);
  form.append('model', 'saaras:v3');
  form.append('mode', 'transcribe');
  form.append('language_code', 'unknown');

  const res = await fetch(SARVAM_STT_URL, {
    method: 'POST',
    headers: {
      'api-subscription-key': apiKey,
    },
    body: form,
  });

  if (!res.ok) {
    throw new Error(`Sarvam transcription failed ${res.status}: ${await res.text()}`);
  }

  const body = (await res.json()) as SarvamTranscriptionResponse;
  const transcript = body.transcript?.trim();
  if (!transcript) throw new Error('Sarvam returned an empty transcript');

  return {
    transcript,
    languageCode: languageFromSpeechCode(body.language_code),
    languageProbability: body.language_probability ?? null,
  };
}
