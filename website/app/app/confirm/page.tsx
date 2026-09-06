"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Mic,
  Briefcase,
  GraduationCap,
  Award,
  ChevronRight,
} from "lucide-react";
import { UI_STRINGS } from "@/lib/languages";
import { getLastResult, setIntent, type Intent } from "@/lib/session-state";
import type { ConverseResponse } from "@/lib/site-api";
import { speak, stopSpeaking } from "@/lib/speech";
import { useSiteStore } from "@/lib/site-store";
import { BrandMark } from "@/components/ui";

const OPTIONS: { intent: Intent; icon: React.ReactNode }[] = [
  { intent: "jobs", icon: <Briefcase className="h-5 w-5" /> },
  { intent: "training", icon: <GraduationCap className="h-5 w-5" /> },
  { intent: "certificate", icon: <Award className="h-5 w-5" /> },
];

export default function ConfirmScreen() {
  const router = useRouter();
  const { language } = useSiteStore();
  const [result, setResult] = useState<ConverseResponse | null | undefined>(
    undefined,
  );

  useEffect(() => {
    setResult(getLastResult());
  }, []);

  const t = language ? UI_STRINGS[language] : UI_STRINGS.hi;
  const known = (result?.mappings ?? [])
    .filter((m) => m.title)
    .filter((m, i, arr) => arr.findIndex((x) => x.qpCode === m.qpCode) === i);
  const skillLabel = known.map((m) => m.title).join(", ");
  const confirmation = skillLabel
    ? t.confirmUnderstood.replace("{skill}", skillLabel)
    : t.noMatch;

  useEffect(() => {
    if (language && result && confirmation) {
      const timer = setTimeout(() => speak(confirmation, language), 350);
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

  function choose(intent: Intent) {
    setIntent(intent);
    router.push("/app/results");
  }

  const optionLabel: Record<Intent, string> = {
    jobs: t.optionJobs,
    training: t.optionTraining,
    certificate: t.optionCertificate,
  };

  return (
    <div className="flex min-h-full flex-col">
      <div className="px-5 pb-2.5 pt-1">
        <button
          onClick={() => router.replace("/app/speak")}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-alt"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      </div>

      <div className="flex flex-col gap-4 px-5 pb-8">
        <div className="flex items-start gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand/10">
            <Mic className="h-[18px] w-[18px] text-brand" />
          </div>
          <div className="flex-1">
            <p className="text-[11px] uppercase tracking-wide text-foreground-faint">
              {t.youSaid}
            </p>
            <div className="mt-1 rounded-2xl rounded-tl-sm border border-border bg-surface-alt p-3.5">
              <p className="text-lg italic">{result.transcript}</p>
            </div>
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-alt">
            <BrandMark size={20} />
          </div>
          <div className="flex-1">
            <p className="text-[11px] uppercase tracking-wide text-foreground-faint">
              SAKSHAM
            </p>
            <div className="mt-1 rounded-2xl rounded-tl-sm border border-brand/15 bg-brand/10 p-3.5">
              <p className="text-lg">{confirmation}</p>
            </div>
          </div>
        </div>

        <div className="mt-2">
          <h2 className="mb-3.5 text-center text-xl font-bold">{t.whatNext}</h2>
          <div className="flex flex-col gap-3">
            {OPTIONS.map((o) => (
              <button
                key={o.intent}
                onClick={() => choose(o.intent)}
                className="flex items-center gap-3.5 rounded-2xl border-[1.5px] border-border bg-surface px-4 py-4 transition hover:border-brand"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
                  {o.icon}
                </div>
                <span className="flex-1 text-left text-base font-medium">
                  {optionLabel[o.intent]}
                </span>
                <ChevronRight className="h-5 w-5 text-foreground-faint" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
