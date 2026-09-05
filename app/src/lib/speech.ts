import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { File, Paths } from 'expo-file-system';
import * as Speech from 'expo-speech';
import { Platform } from 'react-native';

import { synthesizeSpeech } from '@/lib/api';
import type { LanguageCode } from '@/lib/api';
import { speechTagFor } from '@/constants/languages';

let speaking = false;
let player: AudioPlayer | null = null;
// bumped on every speak()/stopSpeaking() so a slow TTS response that resolves
// after the user has moved on doesn't start playing over the next prompt.
let generation = 0;

function cleanupPlayer() {
  if (player) {
    try {
      player.remove();
    } catch {
      // already released
    }
    player = null;
  }
}

function deviceSpeak(text: string, language: LanguageCode) {
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

/** Speak text aloud in the given language via Sarvam TTS (proxied through the
 *  backend), falling back to the on-device engine on web or any failure.
 *  Any in-progress utterance is stopped first. */
export async function speak(text: string, language: LanguageCode) {
  if (!text) return;
  stopSpeaking();
  const myGeneration = generation;
  speaking = true;

  if (Platform.OS === 'web') {
    deviceSpeak(text, language);
    return;
  }

  try {
    const { audioUrl, format } = await synthesizeSpeech(text, language);
    if (myGeneration !== generation) return;
    if (format === 'text' || !audioUrl.startsWith('data:audio')) {
      deviceSpeak(text, language);
      return;
    }

    const base64 = audioUrl.slice(audioUrl.indexOf(',') + 1);
    const file = new File(Paths.cache, `tts-${Date.now()}.wav`);
    try {
      file.create({ overwrite: true });
    } catch {
      // create() throws only if it already exists without overwrite — ignore
    }
    file.write(base64, { encoding: 'base64' });

    await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false });
    if (myGeneration !== generation) {
      try {
        file.delete();
      } catch {
        // best effort
      }
      return;
    }

    player = createAudioPlayer(file.uri);
    const sub = player.addListener('playbackStatusUpdate', (status) => {
      if (status.didJustFinish) {
        speaking = false;
        sub.remove();
        cleanupPlayer();
        try {
          file.delete();
        } catch {
          // best effort
        }
      }
    });
    player.play();
  } catch {
    if (myGeneration === generation) deviceSpeak(text, language);
  }
}

export function stopSpeaking() {
  generation += 1;
  Speech.stop();
  cleanupPlayer();
  speaking = false;
}

export function isSpeaking() {
  return speaking;
}
