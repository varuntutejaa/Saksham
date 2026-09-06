"use client";

import { useCallback, useRef, useState } from "react";
import { speechTagFor, type LanguageCode } from "./languages";

/**
 * Web equivalent of the app's expo-audio recorder + Sarvam transcription:
 * - real mic input level (0-1) via the Web Audio API, to drive the orb's pulse
 * - a live transcript via the browser's SpeechRecognition (Chrome/Edge/Safari;
 *   unsupported browsers fall back to typing, same as the app's "Type instead").
 */
export function useVoiceRecorder(language: LanguageCode) {
  const [isRecording, setIsRecording] = useState(false);
  const [level, setLevel] = useState(0);
  const [supported] = useState(
    () => typeof window !== "undefined" && !!(window.SpeechRecognition || window.webkitSpeechRecognition),
  );

  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const cleanupAudio = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    setLevel(0);
  }, []);

  const start = useCallback(
    async (onResult: (transcript: string) => void, onError: (msg: string) => void) => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        audioCtxRef.current = ctx;
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        ctx.createMediaStreamSource(stream).connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);

        function tick() {
          analyser.getByteTimeDomainData(data);
          let sum = 0;
          for (let i = 0; i < data.length; i++) {
            const v = (data[i] - 128) / 128;
            sum += v * v;
          }
          const rms = Math.sqrt(sum / data.length);
          setLevel(Math.min(1, rms * 4));
          rafRef.current = requestAnimationFrame(tick);
        }
        tick();
      } catch {
        onError("Microphone permission needed");
        return;
      }

      setIsRecording(true);

      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) {
        // no browser STT — level metering still runs so "listening" feels real;
        // caller must fall back to typing.
        return;
      }
      const recognition = new SR();
      recognitionRef.current = recognition;
      recognition.lang = speechTagFor(language);
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.onresult = (e: SpeechRecognitionEvent) => {
        const transcript = Array.from(e.results)
          .map((r) => r[0].transcript)
          .join(" ");
        onResult(transcript);
      };
      recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
        if (e.error !== "aborted" && e.error !== "no-speech") onError(e.error);
      };
      recognition.onend = () => {
        setIsRecording(false);
        cleanupAudio();
      };
      recognition.start();
    },
    [language, cleanupAudio],
  );

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsRecording(false);
    cleanupAudio();
  }, [cleanupAudio]);

  return { isRecording, level, supported, start, stop };
}
