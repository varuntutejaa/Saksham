import { env, hasBhashini, hasSarvam } from "../lib/env.js";
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
  provider: "sarvam" | "bhashini" | "mock";
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

const SARVAM_STT_URL = "https://api.sarvam.ai/speech-to-text";

const SARVAM_LANGUAGE_CODES: Record<Language, string> = {
  en: "en-IN",
  hi: "hi-IN",
  bn: "bn-IN",
  ta: "ta-IN",
  te: "te-IN",
  mr: "mr-IN",
  kn: "kn-IN",
  gu: "gu-IN",
  pa: "pa-IN",
  or: "od-IN",
};

const LANGUAGE_BY_SARVAM_CODE: Record<string, Language> = Object.fromEntries(
  Object.entries(SARVAM_LANGUAGE_CODES).map(([language, sarvamCode]) => [sarvamCode, language as Language]),
) as Record<string, Language>;

interface SarvamSpeechResponse {
  transcript?: string;
  language_code?: string | null;
  language_probability?: number | null;
}

interface TranscribeOptions {
  autoDetect?: boolean;
  mimeType?: string;
  fileName?: string;
}

export async function transcribeAudio(
  audio: Buffer | undefined,
  language: Language = "hi",
  options: TranscribeOptions = {},
): Promise<TranscribeResult> {
  if (hasSarvam && audio?.length) {
    return callSarvamASR(audio, language, options);
  }
  if (hasBhashini) {
    // return callBhashiniASR(audio, language)
  }
  return {
    transcript: MOCK_TRANSCRIPTS[language] ?? MOCK_TRANSCRIPTS.hi,
    language,
    provider: "mock",
    confidence: 0.82,
  };
}

/** `audio/m4a` isn't in Sarvam's accepted MIME list (it wants `audio/x-m4a`), but
 *  that's exactly what iOS/Android report for m4a recordings — normalize it. */
function normalizeMimeType(mimeType: string | undefined): string | undefined {
  if (mimeType === "audio/m4a") return "audio/x-m4a";
  return mimeType;
}

async function callSarvamASR(
  audio: Buffer,
  language: Language,
  options: TranscribeOptions,
): Promise<TranscribeResult> {
  const form = new FormData();
  const mimeType = normalizeMimeType(options.mimeType) ?? "audio/x-m4a";
  const fileName = options.fileName ?? "speech.m4a";
  const audioCopy = new Uint8Array(audio.byteLength);
  audioCopy.set(audio);
  form.append("file", new Blob([audioCopy.buffer], { type: mimeType }), fileName);
  form.append("model", "saaras:v3");
  form.append("mode", "transcribe");
  form.append("language_code", options.autoDetect ? "unknown" : SARVAM_LANGUAGE_CODES[language]);

  const res = await fetch(SARVAM_STT_URL, {
    method: "POST",
    headers: { "api-subscription-key": env.sarvamApiKey },
    body: form,
  });

  if (!res.ok) {
    throw new Error(`Sarvam transcription failed ${res.status}: ${await res.text()}`);
  }

  const body = (await res.json()) as SarvamSpeechResponse;
  const transcript = body.transcript?.trim();
  if (!transcript) throw new Error("Sarvam returned an empty transcript");

  const detectedLanguage = body.language_code ? LANGUAGE_BY_SARVAM_CODE[body.language_code] : undefined;
  return {
    transcript,
    language: detectedLanguage ?? language,
    provider: "sarvam",
    confidence: body.language_probability ?? 0.9,
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
