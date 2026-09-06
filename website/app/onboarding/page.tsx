"use client";

import { useRouter } from "next/navigation";
import { HandMetal } from "lucide-react";
import { useSiteStore } from "@/lib/site-store";
import { resetAnswers } from "@/lib/onboarding-answers";
import { UI_STRINGS } from "@/lib/languages";
import { Button, Screen } from "@/components/ui";

export default function OnboardingIntro() {
  const router = useRouter();
  const { language } = useSiteStore();
  const t = language ? UI_STRINGS[language] : UI_STRINGS.hi;

  function start() {
    resetAnswers();
    router.push("/onboarding/gender");
  }

  return (
    <Screen>
      <div className="flex flex-1 flex-col justify-between px-7 py-10">
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-[32px] bg-brand/10">
            <HandMetal className="h-11 w-11 text-brand" />
          </div>
          <h1 className="mt-6 text-2xl font-bold">{t.onboardIntroTitle}</h1>
          <p className="mt-2.5 max-w-xs text-foreground-dim">
            {t.onboardIntroBody}
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <Button label={t.onboardStart} onPress={start} variant="accent" />
          <Button label={t.onboardSkip} href="/app" variant="ghost" size="md" />
        </div>
      </div>
    </Screen>
  );
}
