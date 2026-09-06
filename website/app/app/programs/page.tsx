"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, MapPin, Clock, Users, Phone } from "lucide-react";
import { getPrograms, type Program } from "@/lib/site-api";
import { UI_STRINGS } from "@/lib/languages";
import { useSiteStore } from "@/lib/site-store";
import { Button, Card, Chip } from "@/components/ui";

export default function ProgramsScreen() {
  const { language, state, district } = useSiteStore();
  const [programs, setPrograms] = useState<Program[] | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    setError(false);
    setPrograms(null);
    getPrograms({ state, district })
      .then(async (rows) => (rows.length > 0 ? rows : getPrograms()))
      .then(setPrograms)
      .catch(() => setError(true));
  }, [state, district]);

  useEffect(load, [load]);

  if (!language) return null;
  const t = UI_STRINGS[language];

  return (
    <div className="flex min-h-full flex-col">
      <div className="px-5 pb-1 pt-3">
        <h1 className="text-xl font-bold">{t.programsTitle}</h1>
        <p className="text-sm text-foreground-dim">{t.programsSubtitle}</p>
      </div>

      {error && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8">
          <p className="text-center text-sm text-danger">{t.noConnection}</p>
          <Button
            label={t.tryAgain}
            variant="secondary"
            size="md"
            fullWidth={false}
            onPress={load}
          />
        </div>
      )}

      {!error && programs === null && (
        <div className="flex flex-1 flex-col items-center justify-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-brand" />
          <p className="text-sm text-foreground-dim">{t.loadingPrograms}</p>
        </div>
      )}

      {!error && programs && (
        <div className="grid gap-3 p-5 pt-3 sm:grid-cols-2">
          {programs.map((item) => (
            <Card key={item.id} className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="rounded-lg bg-brand px-2.5 py-1.5 text-xs font-semibold text-white">
                  {item.scheme}
                  {item.component ? ` · ${item.component}` : ""}
                </span>
                {item.stipend && <Chip label={t.stipendYes} tone="accent" />}
              </div>
              <h3 className="text-lg font-bold">
                {language === "hi" ? (item.nameHindi ?? item.name) : item.name}
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {item.sector && <Chip label={item.sector} />}
                {item.nsqfLevel != null && (
                  <Chip label={`NSQF ${item.nsqfLevel}`} />
                )}
                {item.durationWeeks != null && (
                  <Chip
                    label={`${item.durationWeeks} ${t.weeks}`}
                    icon={<Clock className="h-3 w-3" />}
                  />
                )}
                {typeof item.seatsAvailable === "number" && (
                  <Chip
                    label={`${item.seatsAvailable} ${t.seats}`}
                    icon={<Users className="h-3 w-3" />}
                    tone="success"
                  />
                )}
              </div>
              {(item.district || item.state) && (
                <div className="flex items-center gap-1 text-xs text-foreground-faint">
                  <MapPin className="h-3 w-3" />
                  {[item.district, item.state].filter(Boolean).join(", ")}
                </div>
              )}
              {item.contactPhone && (
                <Button
                  label={`${t.call} · ${item.contactPhone}`}
                  variant="success"
                  size="md"
                  icon={<Phone className="h-4 w-4" />}
                  onPress={() =>
                    (window.location.href = `tel:${item.contactPhone}`)
                  }
                />
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
