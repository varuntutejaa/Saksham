"use client";

import { CheckCircle2 } from "lucide-react";
import { useSiteStore } from "@/lib/site-store";
import { UI_STRINGS } from "@/lib/languages";
import { Button, Screen } from "@/components/ui";

export default function OnboardingDone() {
  const { language } = useSiteStore();
  const t = language ? UI_STRINGS[language] : UI_STRINGS.hi;

  return (
    <Screen>
      <div className="flex flex-1 flex-col justify-between px-7 py-10">
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="flex h-[140px] w-[140px] items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/40">
            <CheckCircle2 className="h-[72px] w-[72px] text-emerald-600" />
          </div>
          <h1 className="mt-7 text-2xl font-bold">{t.onboardDoneTitle}</h1>
          <p className="mt-2.5 max-w-xs text-foreground-dim">
            {t.onboardDoneBody}
          </p>
        </div>
        <Button label={t.onboardContinue} href="/app" variant="accent" />
      </div>
    </Screen>
  );
}
