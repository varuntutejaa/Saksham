"use client";

import { speechTagFor, type LanguageCode } from "./languages";

/**
 * Languages routed through ElevenLabs instead of the browser's own voice.
 *
 * Empty for now: ElevenLabs' free API tier only exposes its ~20 built-in
 * "premade" voices, all Western-accented (English/American) — there is no
 * way to get an Indian voice out of it without a paid plan (Voice Library
 * access, which is what has the real Indian voices, is gated behind
 * Starter+). Rather than ship an American voice for a site about Indian
 * languages, every language uses the browser's own speech synthesis below,
 * explicitly targeting an Indian locale (hi-IN, en-IN, ta-IN, ...) per
 * language in lib/languages.ts.
 *
 * To re-enable ElevenLabs once the plan is upgraded: add the language
 * codes here and set ELEVENLABS_VOICE_ID (see app/api/tts/route.ts) to a
 * real Indian voice — e.g. "Fo1P5yVLG09zFcOP3CtY" (Amit Gupta, male,
 * Hindi/English) or "WCm1zbL9QZhPl3W662WR" (Koyal, female).
 */
const ELEVENLABS_LANGUAGES: LanguageCode[] = [];

let currentAudio: HTMLAudioElement | null = null;
let currentToken = 0;
let voicesReady: Promise<SpeechSynthesisVoice[]> | null = null;

/** speechSynthesis.getVoices() is populated asynchronously in most
 *  browsers — the first call after page load often returns []. Wait for
 *  the voiceschanged event (with a timeout) so voice selection below
 *  actually has the full list to search. */
function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (voicesReady) return voicesReady;
  voicesReady = new Promise((resolve) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      resolve([]);
      return;
    }
    const existing = window.speechSynthesis.getVoices();
    if (existing.length > 0) {
      resolve(existing);
      return;
    }
    const timeout = setTimeout(() => resolve(window.speechSynthesis.getVoices()), 1000);
    window.speechSynthesis.onvoiceschanged = () => {
      clearTimeout(timeout);
      resolve(window.speechSynthesis.getVoices());
    };
  });
  return voicesReady;
}

/** Picks the best available voice for an Indian locale like "hi-IN": an
 *  exact locale match first, then any voice for the base language ("hi"),
 *  preferring one whose name/lang otherwise signals an Indian variant. */
function pickIndianVoice(voices: SpeechSynthesisVoice[], tag: string): SpeechSynthesisVoice | undefined {
  const exact = voices.find((v) => v.lang.toLowerCase() === tag.toLowerCase());
  if (exact) return exact;
  const base = tag.split("-")[0].toLowerCase();
  const sameLanguage = voices.filter((v) => v.lang.toLowerCase().startsWith(base));
  if (sameLanguage.length === 0) return undefined;
  const indianFlavoured = sameLanguage.find((v) => /in\b|india/i.test(v.lang) || /india/i.test(v.name));
  return indianFlavoured ?? sameLanguage[0];
}

async function speakWithBrowser(text: string, language: LanguageCode) {
  if (typeof window === "undefined" || !("speechSynthesis" in window) || !text) return;
  try {
    window.speechSynthesis.cancel();
    const tag = speechTagFor(language);
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = tag;
    utter.rate = 0.95;
    const voices = await loadVoices();
    const voice = pickIndianVoice(voices, tag);
    if (voice) utter.voice = voice;
    window.speechSynthesis.speak(utter);
  } catch {
    /* ignore */
  }
}

/** Text-to-speech: an Indian-locale browser voice for every language by
 *  default (see the note on ELEVENLABS_LANGUAGES above for why), with
 *  ElevenLabs available as an upgrade path for any language listed there.
 *  Fire-and-forget — callers don't need to await it. */
export function speak(text: string, language: LanguageCode) {
  if (!text) return;
  stopSpeaking();
  const token = ++currentToken;

  if (!ELEVENLABS_LANGUAGES.includes(language)) {
    speakWithBrowser(text, language);
    return;
  }

  fetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, language }),
  })
    .then(async (res) => {
      if (token !== currentToken) return; // superseded by a newer call
      if (!res.ok) throw new Error(`tts ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      currentAudio = audio;
      audio.addEventListener("ended", () => URL.revokeObjectURL(url), { once: true });
      await audio.play();
    })
    .catch(() => {
      if (token === currentToken) speakWithBrowser(text, language);
    });
}

export function stopSpeaking() {
  currentToken++; // invalidate any in-flight ElevenLabs fetch
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      /* ignore */
    }
  }
}
