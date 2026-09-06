"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, User, UserRound } from "lucide-react";
import { useSiteStore } from "@/lib/site-store";
import { getAnswers, setAnswer } from "@/lib/onboarding-answers";
import { UI_STRINGS } from "@/lib/languages";
import type { Gender } from "@/lib/site-api";
import { OptionRow, Screen, StepProgress } from "@/components/ui";

export default function GenderStep() {
  const router = useRouter();
  const { language } = useSiteStore();
  const t = language ? UI_STRINGS[language] : UI_STRINGS.hi;
  const [selected, setSelected] = useState<Gender | undefined>(
    getAnswers().gender,
  );

  const options: { value: Gender; label: string; icon: React.ReactNode }[] = [
    { value: "male", label: t.genderMale, icon: <User className="h-4 w-4" /> },
    {
      value: "female",
      label: t.genderFemale,
      icon: <UserRound className="h-4 w-4" />,
    },
    {
      value: "other",
      label: t.genderOther,
      icon: <User className="h-4 w-4" />,
    },
  ];

  function choose(value: Gender) {
    setSelected(value);
    setAnswer("gender", value);
    setTimeout(() => router.push("/onboarding/age"), 200);
  }

  return (
    <Screen>
      <div className="flex items-center gap-3.5 px-5 pb-2.5 pt-4">
        <button
          onClick={() => router.back()}
          className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-surface-alt"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <StepProgress step={1} total={3} />
        </div>
      </div>
      <div className="px-5 pt-4">
        <p className="text-sm font-semibold text-brand">
          {t.stepLabel.replace("{n}", "1")}
        </p>
        <h1 className="mb-6 mt-1.5 text-2xl font-bold">{t.genderQuestion}</h1>
        <div className="flex flex-col gap-3">
          {options.map((o) => (
            <OptionRow
              key={o.value}
              label={o.label}
              icon={o.icon}
              selected={selected === o.value}
              onPress={() => choose(o.value)}
            />
          ))}
        </div>
      </div>
    </Screen>
  );
}
