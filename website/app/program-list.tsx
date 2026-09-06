"use client";

import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { getPrograms, type Program } from "@/lib/api";
import { Card, Chip, Skeleton } from "@/components/ui";

export function ProgramList() {
  const [programs, setPrograms] = useState<Program[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPrograms()
      .then(setPrograms)
      .catch(() => setError("Could not load programmes — the backend may be waking up. Try again shortly."));
  }, []);

  if (error) return <p className="text-sm text-danger">{error}</p>;

  if (programs === null) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {programs.map((p) => (
        <Card key={p.id}>
          <div className="flex flex-wrap items-center gap-2">
            <Chip label={`${p.scheme}${p.component ? ` · ${p.component}` : ""}`} tone="primary" />
            {p.stipend && <Chip label="Stipend" tone="success" />}
          </div>
          <h3 className="mt-2 font-semibold">{p.name}</h3>
          <p className="mt-1 text-sm text-foreground-dim">
            {[p.sector, p.nsqfLevel ? `NSQF ${p.nsqfLevel}` : null, p.durationWeeks ? `${p.durationWeeks} weeks` : null, p.mode]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <p className="mt-1 flex items-center gap-1 text-sm text-foreground-dim">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            {p.district}, {p.state}
            {typeof p.seatsAvailable === "number" ? ` · ${p.seatsAvailable} seats` : ""}
          </p>
        </Card>
      ))}
    </div>
  );
}
