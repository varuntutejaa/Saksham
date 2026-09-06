"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  Book,
  Library,
  Wrench,
  GraduationCap,
  Award,
} from "lucide-react";
import { useBeneficiaryAuth } from "@/lib/beneficiary-auth";
import { useSiteStore } from "@/lib/site-store";
import { getAnswers, setAnswer } from "@/lib/onboarding-answers";
import { UI_STRINGS } from "@/lib/languages";
import type { Education } from "@/lib/site-api";
import { OptionRow, Screen, StepProgress } from "@/components/ui";

export default function EducationStep() {
  const router = useRouter();
  const { language } = useSiteStore();
  const { updateProfile } = useBeneficiaryAuth();
  const t = language ? UI_STRINGS[language] : UI_STRINGS.hi;
  const [selected, setSelected] = useState<Education | undefined>(
    getAnswers().education,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const options: { value: Education; label: string; icon: React.ReactNode }[] =
    [
      {
        value: "below_10th",
        label: t.eduBelow10th,
        icon: <BookOpen className="h-4 w-4" />,
      },
      { value: "10th", label: t.edu10th, icon: <Book className="h-4 w-4" /> },
      {
        value: "12th",
        label: t.edu12th,
        icon: <Library className="h-4 w-4" />,
      },
      {
        value: "iti_diploma",
        label: t.eduIti,
        icon: <Wrench className="h-4 w-4" />,
      },
      {
        value: "undergrad",
        label: t.eduUndergrad,
        icon: <GraduationCap className="h-4 w-4" />,
      },
      {
        value: "postgrad",
        label: t.eduPostgrad,
        icon: <Award className="h-4 w-4" />,
      },
    ];

  async function choose(value: Education) {
    if (saving) return;
    setSelected(value);
    setAnswer("education", value);
    setSaving(true);
    setError(null);
    const answers = getAnswers();
    try {
      await updateProfile({ ...answers, education: value, onboarded: true });
      router.replace("/onboarding/done");
    } catch (e) {
      setSaving(false);
      setError(e instanceof Error ? e.message : t.tryAgain);
    }
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
          <StepProgress step={3} total={3} />
        </div>
      </div>
      <div className="px-5 pt-4">
        <p className="text-sm font-semibold text-brand">
          {t.stepLabel.replace("{n}", "3")}
        </p>
        <h1 className="mb-6 mt-1.5 text-2xl font-bold">{t.eduQuestion}</h1>
        {error && <p className="mb-3 text-sm text-danger">{error}</p>}
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
