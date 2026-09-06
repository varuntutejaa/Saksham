"use client";

import { Mic, Loader2 } from "lucide-react";

export type MicState = "idle" | "listening" | "thinking";

/** The mic button as a slowly rotating clay→teal orb whose glow and ripple
 *  react to actual microphone input level (0-1) in real time — the web
 *  equivalent of the app's react-native-reanimated MicOrb driven by
 *  expo-audio metering. */
export function MicOrb({
  state,
  onPress,
  level = 0,
}: {
  state: MicState;
  onPress: () => void;
  level?: number;
}) {
  const glow = 0.55 + level * 0.45;
  return (
    <button
      onClick={onPress}
      aria-label="Toggle recording"
      className="group relative flex h-40 w-40 items-center justify-center"
    >
      {/* soft ambient glow, breathes with mic level */}
      <span
        className="absolute inset-2 rounded-full bg-gradient-to-br from-brand to-accent blur-2xl transition-opacity duration-150"
        style={{ opacity: state === "idle" ? 0.35 : glow }}
      />

      {/* slow rotating conic ring — the orb's signature idle motion */}
      <span
        className="absolute inset-0 rounded-full opacity-80 [animation:orb-rotate_9s_linear_infinite]"
        style={{
          background:
            "conic-gradient(from 0deg, var(--brand), var(--accent), var(--brand))",
        }}
      />
      <span className="absolute inset-[3px] rounded-full bg-background" />

      {/* ripple rings while listening, spaced by mic level */}
      {state === "listening" && (
        <>
          <span
            className="absolute rounded-full border-2 border-brand/40 [animation:orb-ripple_1.6s_ease-out_infinite]"
            style={{ inset: -6 - level * 14 }}
          />
          <span
            className="absolute rounded-full border-2 border-accent/30 [animation:orb-ripple_1.6s_ease-out_infinite_0.4s]"
            style={{ inset: -6 - level * 14 }}
          />
        </>
      )}

      <span
        className="relative flex h-[104px] w-[104px] items-center justify-center rounded-full bg-surface shadow-[var(--shadow-float)] transition-transform duration-150 group-active:scale-95"
        style={{ transform: state === "listening" ? `scale(${1 + level * 0.08})` : undefined }}
      >
        {state === "thinking" ? (
          <Loader2 className="h-9 w-9 animate-spin text-brand" />
        ) : (
          <Mic className={`h-9 w-9 transition-colors ${state === "listening" ? "text-danger" : "text-brand"}`} />
        )}
      </span>

      <style jsx>{`
        @keyframes orb-rotate {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes orb-ripple {
          from {
            opacity: 0.6;
            transform: scale(0.9);
          }
          to {
            opacity: 0;
            transform: scale(1.35);
          }
        }
      `}</style>
    </button>
  );
}
