import { env, hasBhashini, hasGroq, hasSarvam } from "../lib/env.js";
import type { Language } from "@prisma/client";

/**
 * Speech-to-text and text-to-speech.
 *
 * STT priority: Sarvam (best accuracy for Indian languages) -> Groq Whisper
 * (multilingual fallback, used only if a configured Sarvam call actually
 * fails) -> Bhashini (stubbed) -> a deterministic mock so the whole flow —
 * and the demo — works fully offline with zero external dependencies.
 */

export interface TranscribeResult {
  transcript: string;
  language: Language;
  provider: "sarvam" | "groq" | "bhashini" | "mock";
  confidence: number;
}

export interface SynthesizeResult {
  /** data URI (mock) or CDN URL (bhashini) of the spoken audio */
  audioUrl: string;
  provider: "bhashini" | "mock";
  format: "wav" | "mp3" | "text";
}

const MOCK_TRANSCRIPTS: Record<Language, string> = {
  hi: "main apne gaon mein mitti ke bartan aur matka banata hoon, silai ka kaam bhi jaanta hoon",
  bn: "ami amar grame matir bhanda banai ebong tailoring kaj jani",
  ta: "naan en kiraamathil mann paanaigal seiginren, thaiyal velaiyum theriyum",
  en: "i make clay pots and matka in my village and i also know tailoring",
  te: "nenu maa oorlo matka panulu chestanu, tailoring kuda telusu",
  mr: "mi mazya gavat matka cha kaam karto, tailoring pan yete",
  kn: "naanu nam ooru alli matka kelsa madtini, tailoring gottu",
  gu: "hoo mara gaam ma matka nu kaam karu chhu, tailoring pan aavde chhe",
  pa: "main apne pind vich matka da kaam karda haan, tailoring vi aundi hai",
  or: "mu mo gaon re matka kaam kare, tailoring vi jane",
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
  if (audio?.length) {
    if (hasSarvam) {
      try {
        return await callSarvamASR(audio, language, options);
      } catch (err) {
        if (!hasGroq) throw err;
        console.error("[speech] Sarvam STT failed, falling back to Groq:", err);
      }
    }
    if (hasGroq) {
      return callGroqASR(audio, language, options);
    }
  }
  if (hasBhashini) {
    // return callBhashiniASR(audio, language)
  }
  return {
    transcript: MOCK_TRANSCRIPTS[language],
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

const GROQ_TRANSCRIPTION_URL = "https://api.groq.com/openai/v1/audio/transcriptions";
// Full (non-turbo) model — this path only runs when Sarvam has already
// failed, so accuracy matters more than shaving off latency here.
const GROQ_WHISPER_MODEL = "whisper-large-v3";

/** Whisper's verbose_json response names the detected language in full English
 *  (e.g. "hindi"), not an ISO code — map the ones relevant to Saksham back. */
const WHISPER_LANGUAGE_NAMES: Partial<Record<string, Language>> = {
  english: "en",
  hindi: "hi",
  bengali: "bn",
  tamil: "ta",
  telugu: "te",
  marathi: "mr",
  kannada: "kn",
  gujarati: "gu",
  punjabi: "pa",
  panjabi: "pa",
  odia: "or",
  oriya: "or",
};

interface GroqTranscriptionResponse {
  text?: string;
  language?: string;
}

/** Fallback STT via Groq's hosted Whisper — only invoked when a configured
 *  Sarvam call throws. Whisper's language codes are ISO-639-1, which is
 *  exactly what our `Language` type already uses, so it's passed through
 *  as-is when not auto-detecting. */
async function callGroqASR(
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
  form.append("model", GROQ_WHISPER_MODEL);
  form.append("response_format", "verbose_json");
  if (!options.autoDetect) form.append("language", language);

  const res = await fetch(GROQ_TRANSCRIPTION_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.groqApiKey}` },
    body: form,
  });

  if (!res.ok) {
    throw new Error(`Groq transcription failed ${res.status}: ${await res.text()}`);
  }

  const body = (await res.json()) as GroqTranscriptionResponse;
  const transcript = body.text?.trim();
  if (!transcript) throw new Error("Groq returned an empty transcript");

  const detectedLanguage = body.language ? WHISPER_LANGUAGE_NAMES[body.language.toLowerCase()] : undefined;
  return {
    transcript,
    language: detectedLanguage ?? language,
    provider: "groq",
    // Whisper doesn't return a single confidence/language-probability score
    // the way Sarvam does — this is a fixed placeholder, not a measurement.
    confidence: 0.75,
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
