import * as Speech from 'expo-speech';
import type { LanguageCode } from '@/lib/api';
import { speechTagFor } from '@/constants/languages';

let speaking = false;

/** Speak text aloud in the given language. Stops any current utterance first. */
export function speak(text: string, language: LanguageCode) {
  if (!text) return;
  Speech.stop();
  speaking = true;
  Speech.speak(text, {
    language: speechTagFor(language),
    rate: 0.92,
    pitch: 1.0,
    onDone: () => {
      speaking = false;
    },
    onStopped: () => {
      speaking = false;
    },
    onError: () => {
      speaking = false;
    },
  });
}

export function stopSpeaking() {
  Speech.stop();
  speaking = false;
}

export function isSpeaking() {
  return speaking;
}
