"use client";

import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { getPrograms, type Program } from "@/lib/api";

export function ProgramList() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPrograms()
      .then(setPrograms)
      .catch(() => setError("Could not load programmes. Is the backend running?"));
  }, []);

  if (error) return <p className="mt-3 text-sm text-red-600">{error}</p>;

  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      {programs.map((p) => (
        <div
          key={p.id}
          className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800"
        >
          <div className="flex items-center gap-2">
            <span className="rounded bg-brand/10 px-2 py-0.5 text-xs font-semibold text-brand">
              {p.scheme}
              {p.component ? ` · ${p.component}` : ""}
            </span>
            {p.stipend && (
              <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                Stipend
              </span>
            )}
          </div>
          <h3 className="mt-2 font-semibold">{p.name}</h3>
          <p className="mt-1 text-sm text-neutral-500">
            {[
              p.sector,
              p.nsqfLevel ? `NSQF ${p.nsqfLevel}` : null,
              p.durationWeeks ? `${p.durationWeeks} weeks` : null,
              p.mode,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <p className="mt-1 flex items-center gap-1 text-sm text-neutral-500">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            {p.district}, {p.state}
            {typeof p.seatsAvailable === "number"
              ? ` · ${p.seatsAvailable} seats`
              : ""}
          </p>
        </div>
      ))}
    </div>
  );
}
