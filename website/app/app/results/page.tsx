"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Volume2,
  HelpCircle,
  GraduationCap,
  MapPin,
  Clock,
  Users,
  Banknote,
  Sparkles,
  Phone,
  RefreshCw,
  Mic,
} from "lucide-react";
import { UI_STRINGS } from "@/lib/languages";
import { getIntent, getLastResult } from "@/lib/session-state";
import {
  setRecommendationStatus,
  type ConverseResponse,
  type NsqfMapping,
  type ProgramRecommendation,
} from "@/lib/site-api";
import { speak, stopSpeaking } from "@/lib/speech";
import { useSiteStore } from "@/lib/site-store";
import { Button, Card, Chip, Meter } from "@/components/ui";

export default function ResultsScreen() {
  const router = useRouter();
  const { language } = useSiteStore();
  const [result, setResult] = useState<ConverseResponse | null | undefined>(
    undefined,
  );
  const [intent, setIntentState] = useState(getIntent());
  const t = language ? UI_STRINGS[language] : UI_STRINGS.hi;
  const sectionTitle =
    intent === "jobs"
      ? t.jobsTitle
      : intent === "certificate"
        ? t.certTitle
        : t.recommended;

  useEffect(() => {
    setResult(getLastResult());
    setIntentState(getIntent());
  }, []);

  useEffect(() => {
    if (result?.reply.text && language) {
      const timer = setTimeout(() => speak(result.reply.text, language), 350);
      return () => {
        clearTimeout(timer);
        stopSpeaking();
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  useEffect(() => {
    if (!language) router.replace("/welcome");
    else if (result === null) router.replace("/app/speak");
  }, [language, result, router]);

  if (!language || result === undefined || result === null) return null;

  const known = result.mappings
    .filter((m) => m.title)
    .filter((m, i, arr) => arr.findIndex((x) => x.qpCode === m.qpCode) === i);

  return (
    <div className="flex min-h-full flex-col">
      <div className="flex items-center justify-between px-5 pb-2.5 pt-1">
        <button
          onClick={() => router.back()}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-alt"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <button
          onClick={() =>
            result.reply.text && speak(result.reply.text, language)
          }
          className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/10"
        >
          <Volume2 className="h-5 w-5 text-brand" />
        </button>
      </div>

      <div className="flex flex-col gap-3 px-5 pb-24 lg:pb-0">
        <Card>
          <p className="text-[11px] uppercase tracking-wide text-foreground-faint">
            {t.yourSkill}
          </p>
          <div className="mt-2 flex gap-3">
            <div className="w-1 shrink-0 rounded bg-brand" />
            <p className="flex-1 italic">{result.transcript}</p>
          </div>
        </Card>

        {known.length > 0 ? (
          known.map((m) => (
            <NsqfCard
              key={m.qpCode}
              m={m}
              label={t.nsqfMatch}
              matchLabel={t.matchLabel}
            />
          ))
        ) : (
          <Card className="flex items-center gap-3">
            <HelpCircle className="h-6 w-6 shrink-0 text-warning" />
            <p className="flex-1 text-sm text-foreground-dim">{t.noMatch}</p>
          </Card>
        )}

        {result.recommendations.length > 0 && (
          <div className="mt-1 flex flex-col gap-3">
            <div className="mt-1 flex items-center gap-2">
              <GraduationCap className="h-[18px] w-[18px] text-brand" />
              <h2 className="flex-1 text-lg font-bold">{sectionTitle}</h2>
              <span className="rounded-full bg-brand/10 px-2 py-0.5 text-xs font-semibold text-brand">
                {result.recommendations.length}
              </span>
            </div>
            {result.recommendations.map((r) => (
              <ProgramCard key={r.trainingProgramId} r={r} t={t} />
            ))}
          </div>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-[60px] z-10 flex gap-2.5 border-t border-border bg-background px-5 py-3 lg:static lg:mt-2 lg:rounded-2xl lg:border lg:px-4">
        <div className="flex-1">
          <Button
            label={t.speakAgain}
            variant="secondary"
            size="md"
            icon={<RefreshCw className="h-4 w-4" />}
            onPress={() =>
              result.reply.text && speak(result.reply.text, language)
            }
          />
        </div>
        <div className="flex-[1.2]">
          <Button
            label={t.askAgain}
            size="md"
            icon={<Mic className="h-4 w-4" />}
            onPress={() => router.replace("/app/speak")}
          />
        </div>
      </div>
    </div>
  );
}

function NsqfCard({
  m,
  label,
  matchLabel,
}: {
  m: NsqfMapping;
  label: string;
  matchLabel: string;
}) {
  return (
    <Card>
      <p className="text-[11px] uppercase tracking-wide text-foreground-faint">
        {label}
      </p>
      <div className="mt-2 flex items-center gap-3.5">
        <div className="flex-1 space-y-2">
          <h3 className="text-lg font-bold">{m.title}</h3>
          <div className="flex flex-wrap gap-1.5">
            {m.qpCode && <Chip label={m.qpCode} tone="primary" />}
            {m.sector && <Chip label={m.sector} />}
            {m.nsqfLevel != null && (
              <Chip label={`NSQF ${m.nsqfLevel}`} tone="accent" />
            )}
          </div>
        </div>
        <Meter value={m.confidence} />
      </div>
    </Card>
  );
}

function ProgramCard({
  r,
  t,
}: {
  r: ProgramRecommendation;
  t: (typeof UI_STRINGS)["hi"];
}) {
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="rounded-lg bg-brand px-2.5 py-1.5 text-xs font-semibold text-white">
          {r.scheme}
          {r.component ? ` · ${r.component}` : ""}
        </span>
        <Meter value={r.score} size={44} />
      </div>

      <h3 className="text-lg font-bold leading-snug">
        {r.nameHindi ?? r.name}
      </h3>

      {!!r.rationale && (
        <div className="flex items-start gap-2 rounded-xl bg-surface-alt p-3">
          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
          <p className="flex-1 text-sm text-foreground-dim">{r.rationale}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {r.district && (
          <Chip
            label={`${r.district}, ${r.state}`}
            icon={<MapPin className="h-3 w-3" />}
          />
        )}
        {r.durationWeeks != null && (
          <Chip
            label={`${r.durationWeeks} ${t.weeks}`}
            icon={<Clock className="h-3 w-3" />}
          />
        )}
        {r.seatsAvailable != null && (
          <Chip
            label={`${r.seatsAvailable} ${t.seats}`}
            icon={<Users className="h-3 w-3" />}
            tone="success"
          />
        )}
        {r.stipend && (
          <Chip
            label={t.stipendYes}
            icon={<Banknote className="h-3 w-3" />}
            tone="accent"
          />
        )}
      </div>

      {!!r.contactPhone && (
        <Button
          label={`${t.call} · ${r.contactPhone}`}
          variant="success"
          size="md"
          icon={<Phone className="h-4 w-4" />}
          onPress={() => {
            if (r.recommendationId)
              setRecommendationStatus(r.recommendationId, "INTERESTED").catch(
                () => {},
              );
            window.location.href = `tel:${r.contactPhone}`;
          }}
        />
      )}
    </Card>
  );
}
