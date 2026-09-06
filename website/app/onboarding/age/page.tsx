"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useSiteStore } from "@/lib/site-store";
import { getAnswers, setAnswer } from "@/lib/onboarding-answers";
import { UI_STRINGS } from "@/lib/languages";
import { OptionRow, Screen, StepProgress } from "@/components/ui";

const RANGES: { label: string; value: number }[] = [
  { label: "18–25", value: 21 },
  { label: "26–35", value: 30 },
  { label: "36–45", value: 40 },
  { label: "46–60", value: 52 },
  { label: "60+", value: 65 },
];

export default function AgeStep() {
  const router = useRouter();
  const { language } = useSiteStore();
  const t = language ? UI_STRINGS[language] : UI_STRINGS.hi;
  const [selected, setSelected] = useState<number | undefined>(
    getAnswers().age,
  );

  function choose(value: number) {
    setSelected(value);
    setAnswer("age", value);
    setTimeout(() => router.push("/onboarding/education"), 200);
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
          <StepProgress step={2} total={3} />
        </div>
      </div>
      <div className="px-5 pt-4">
        <p className="text-sm font-semibold text-brand">
          {t.stepLabel.replace("{n}", "2")}
        </p>
        <h1 className="mb-6 mt-1.5 text-2xl font-bold">{t.ageQuestion}</h1>
        <div className="flex flex-col gap-3">
          {RANGES.map((r) => (
            <OptionRow
              key={r.value}
              label={`${r.label} ${t.yearsSuffix}`}
              selected={selected === r.value}
              onPress={() => choose(r.value)}
            />
          ))}
        </div>
      </div>
    </Screen>
  );
}
