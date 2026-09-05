import { useEffect, useRef } from 'react';

/** normalized metering (0–1) above which we treat the input as speech */
const SPEECH_LEVEL = 0.22;
/** stop this long after the beneficiary stops talking */
const SILENCE_MS = 1500;
/** ignore the very start, before they've had a chance to begin */
const MIN_MS = 800;
/** hard cap, so a hot mic in a noisy room can't record forever */
const MAX_MS = 30000;

interface Options {
  isRecording: boolean;
  /** 0–1 normalized microphone level, as fed to MicOrb */
  level: number;
  durationMillis: number;
  /** called once, to end the turn — the screen's own mic toggle */
  onStop: () => void;
}

/**
 * Ends a recording once the beneficiary has clearly finished speaking, so a
 * turn closes on its own instead of needing a second tap on the mic. Tapping
 * the mic still works, and is the fallback if a device reports no metering.
 */
export function useAutoStopRecording({ isRecording, level, durationMillis, onStop }: Options) {
  const onStopRef = useRef(onStop);
  onStopRef.current = onStop;

  const heardSpeechRef = useRef(false);
  const lastVoiceAtRef = useRef(0);
  const stoppedRef = useRef(false);

  useEffect(() => {
    if (!isRecording) {
      heardSpeechRef.current = false;
      lastVoiceAtRef.current = 0;
      stoppedRef.current = false;
      return;
    }
    if (stoppedRef.current) return;

    if (level >= SPEECH_LEVEL) {
      heardSpeechRef.current = true;
      lastVoiceAtRef.current = Date.now();
      return;
    }

    if (durationMillis >= MAX_MS) {
      stoppedRef.current = true;
      onStopRef.current();
      return;
    }

    if (!heardSpeechRef.current || durationMillis < MIN_MS) return;
    if (Date.now() - lastVoiceAtRef.current >= SILENCE_MS) {
      stoppedRef.current = true;
      onStopRef.current();
    }
  }, [isRecording, level, durationMillis]);
}
