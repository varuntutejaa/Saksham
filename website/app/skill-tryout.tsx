"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { mapSkill } from "@/lib/api";
import { Button, Card } from "@/components/ui";

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
      setError("Could not reach the API right now — the backend may be waking up. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="!p-5">
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && text.trim() && run(text.trim())}
          placeholder="Describe a skill…"
          className="flex-1 rounded-xl border border-border bg-transparent px-3.5 py-2.5 text-sm outline-none focus:border-brand"
        />
        <Button
          label={loading ? "Mapping…" : "Map to NSQF"}
          onPress={() => text.trim() && run(text.trim())}
          disabled={loading || !text.trim()}
          loading={loading}
          size="md"
          fullWidth={false}
          icon={<Search className="h-4 w-4" />}
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            onClick={() => {
              setText(ex);
              run(ex);
            }}
            className="rounded-full bg-surface-alt px-3 py-1.5 text-xs text-foreground-dim transition hover:text-foreground"
          >
            {ex}
          </button>
        ))}
      </div>

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      {result && (
        <div className="mt-4 space-y-2">
          {result.map((r, i) => (
            <div key={i} className="rounded-xl bg-surface-alt p-3.5 text-sm">
              {r.title ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{r.title}</span>
                    <span className="font-medium text-success">{Math.round(r.confidence * 100)}% match</span>
                  </div>
                  <div className="mt-0.5 text-foreground-dim">
                    {r.qpCode} · {r.sector} · NSQF Level {r.nsqfLevel} · from &ldquo;{r.normalizedSkill}&rdquo;
                  </div>
                </>
              ) : (
                <span className="text-foreground-dim">
                  No confident NSQF match for &ldquo;{r.normalizedSkill}&rdquo; — a counsellor review would be flagged.
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
