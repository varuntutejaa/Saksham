import { hasBhashini } from "../lib/env.js";
import type { Language } from "@prisma/client";

/**
 * Speech-to-text and text-to-speech.
 *
 * If Bhashini credentials are configured the real ASR/TTS pipeline is used
 * (stubbed here — wire the Bhashini ULCA endpoints in `callBhashini`).
 * Otherwise a deterministic mock is returned so the whole flow — and the demo —
 * works fully offline with zero external dependencies.
 */

export interface TranscribeResult {
  transcript: string;
  language: Language;
  provider: "bhashini" | "mock";
  confidence: number;
}

export interface SynthesizeResult {
  /** data URI (mock) or CDN URL (bhashini) of the spoken audio */
  audioUrl: string;
  provider: "bhashini" | "mock";
  format: "wav" | "mp3" | "text";
}

const MOCK_TRANSCRIPTS: Record<string, string> = {
  hi: "main apne gaon mein mitti ke bartan aur matka banata hoon, silai ka kaam bhi jaanta hoon",
  bn: "ami amar grame matir bhanda banai ebong tailoring kaj jani",
  ta: "naan en kiraamathil mann paanaigal seiginren, thaiyal velaiyum theriyum",
  en: "i make clay pots and matka in my village and i also know tailoring",
};

export async function transcribeAudio(
  _audio: Buffer | undefined,
  language: Language = "hi",
): Promise<TranscribeResult> {
  if (hasBhashini) {
    // return callBhashiniASR(_audio, language)
  }
  return {
    transcript: MOCK_TRANSCRIPTS[language] ?? MOCK_TRANSCRIPTS.hi,
    language,
    provider: "mock",
    confidence: 0.82,
  };
}

export async function synthesizeSpeech(
  text: string,
  language: Language = "hi",
): Promise<SynthesizeResult> {
  if (hasBhashini) {
    // return callBhashiniTTS(text, language)
  }
  // Mock: return the text itself as a "text" audio track. The client (RN app /
  // web) speaks it with the on-device TTS engine (expo-speech / Web Speech API),
  // which keeps payloads tiny for low-bandwidth conditions.
  return {
    audioUrl: `data:text/plain;charset=utf-8,${encodeURIComponent(text)}`,
    provider: "mock",
    format: "text",
  };
}
