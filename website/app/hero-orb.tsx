"use client";

import { useEffect, useState } from "react";
import { MicOrb } from "@/components/MicOrb";

const LINES = [
  { skill: "main mitti ke bartan banata hoon", match: "Potter (Kumhar) · NSQF 3" },
  { skill: "silai aur kadhai ka kaam karti hoon", match: "Self Employed Tailor · NSQF 4" },
  { skill: "raj mistri ka kaam, diwar aur plaster", match: "Mason General · NSQF 4" },
];

/** A live, purely client-side illustration for the hero — cycles through
 *  example transcripts next to the real MicOrb component so a visitor sees
 *  the actual product motif, not a stock screenshot. */
export function HeroOrb() {
  const [i, setI] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setI((v) => (v + 1) % LINES.length), 3200);
    return () => clearInterval(id);
  }, []);

  const line = LINES[i];

  return (
    <div className="relative flex flex-col items-center justify-center rounded-[32px] border border-border bg-surface p-10 shadow-[var(--shadow-float)]">
      <MicOrb state="idle" onPress={() => {}} />
      <div key={i} className="mt-6 w-full max-w-[280px] animate-[fade-up_0.4s_ease-out]">
        <p className="rounded-2xl rounded-tl-sm border border-border bg-surface-alt px-4 py-3 text-center text-sm italic text-foreground-dim">
          &ldquo;{line.skill}&rdquo;
        </p>
        <p className="mt-2 text-center text-xs font-semibold text-brand">→ {line.match}</p>
      </div>
      <style jsx>{`
        @keyframes fade-up {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
