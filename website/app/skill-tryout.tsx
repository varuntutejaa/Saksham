"use client";

import { useState } from "react";
import { mapSkill } from "@/lib/api";

type Result = Awaited<ReturnType<typeof mapSkill>>;

const EXAMPLES = [
  "main mitti ke bartan aur matka banata hoon",
  "silai aur kadhai ka kaam karti hoon",
  "raj mistri ka kaam, diwar aur plaster",
  "gaay bhains palta hoon, doodh bechta hoon",
];

export function SkillTryout() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(value: string) {
    setLoading(true);
    setError(null);
    try {
      setResult(await mapSkill(value));
    } catch {
      setError("Could not reach the API. Is the backend running on :4000?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && text.trim() && run(text.trim())}
          placeholder="Describe a skill…"
          className="flex-1 rounded-lg border border-neutral-300 bg-transparent px-3 py-2 outline-none focus:border-brand dark:border-neutral-700"
        />
        <button
          onClick={() => text.trim() && run(text.trim())}
          disabled={loading}
          className="rounded-lg bg-brand px-4 py-2 font-semibold text-white disabled:opacity-50"
        >
          {loading ? "Mapping…" : "Map to NSQF"}
        </button>
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            onClick={() => {
              setText(ex);
              run(ex);
            }}
            className="rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300"
          >
            {ex}
          </button>
        ))}
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {result && (
        <div className="mt-4 space-y-2">
          {result.map((r, i) => (
            <div
              key={i}
              className="rounded-lg bg-neutral-50 p-3 text-sm dark:bg-neutral-900"
            >
              {r.title ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{r.title}</span>
                    <span className="text-emerald-600">
                      {Math.round(r.confidence * 100)}% match
                    </span>
                  </div>
                  <div className="text-neutral-500">
                    {r.qpCode} · {r.sector} · NSQF Level {r.nsqfLevel} · from “
                    {r.normalizedSkill}”
                  </div>
                </>
              ) : (
                <span className="text-neutral-500">
                  No confident NSQF match for “{r.normalizedSkill}” — a
                  counsellor review would be flagged.
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
