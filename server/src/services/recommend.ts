import { prisma } from "../lib/prisma.js";
import type { Language } from "@prisma/client";
import { rationalePhrase } from "./i18n.js";
import type { MappingResult } from "./nsqf.js";

export interface RecommendationResult {
  trainingProgramId: string;
  name: string;
  nameHindi: string | null;
  scheme: string;
  component: string | null;
  sector: string | null;
  nsqfLevel: number | null;
  mode: string;
  durationWeeks: number | null;
  stipend: boolean;
  district: string | null;
  state: string | null;
  contactPhone: string | null;
  seatsAvailable: number | null;
  score: number;
  rationale: string;
}

interface RecommendInput {
  mappings: MappingResult[];
  state?: string | null;
  district?: string | null;
  language?: Language;
}

/**
 * Score PM-AJAY / partner training programmes for a beneficiary.
 *
 * Score components (0–1, weighted):
 *   0.45  same NSQF qualification as a mapped skill
 *   0.20  same sector as a mapped skill
 *   0.15  programme in the beneficiary's district
 *   0.10  programme in the beneficiary's state
 *   0.05  seats currently available
 *   0.05  stipend offered (reduces opportunity cost — key barrier for SC beneficiaries)
 */
export async function recommendPrograms(
  input: RecommendInput,
): Promise<RecommendationResult[]> {
  const { mappings, state, district, language = "hi" } = input;

  const qualIds = mappings
    .map((m) => m.nsqfQualificationId)
    .filter((id): id is string => Boolean(id));
  const sectors = mappings
    .map((m) => m.sector)
    .filter((s): s is string => Boolean(s));

  const programs = await prisma.trainingProgram.findMany({
    where: { active: true },
    include: { nsqfQualification: true },
  });

  const scored = programs.map((p) => {
    let score = 0;
    const reasons: string[] = [];

    if (p.nsqfQualificationId && qualIds.includes(p.nsqfQualificationId)) {
      score += 0.45;
      reasons.push("nsqf");
    }
    if (p.sector && sectors.includes(p.sector)) {
      score += 0.2;
      reasons.push("sector");
    }
    if (district && p.district && p.district.toLowerCase() === district.toLowerCase()) {
      score += 0.15;
      reasons.push("district");
    }
    if (state && p.state && p.state.toLowerCase() === state.toLowerCase()) {
      score += 0.1;
      reasons.push("state");
    }
    if ((p.seatsAvailable ?? 0) > 0) {
      score += 0.05;
      reasons.push("seats");
    }
    if (p.stipend) {
      score += 0.05;
      reasons.push("stipend");
    }

    return {
      trainingProgramId: p.id,
      name: p.name,
      nameHindi: p.nameHindi,
      scheme: p.scheme,
      component: p.component,
      sector: p.sector,
      nsqfLevel: p.nsqfLevel ?? p.nsqfQualification?.nsqfLevel ?? null,
      mode: p.mode,
      durationWeeks: p.durationWeeks,
      stipend: p.stipend,
      district: p.district,
      state: p.state,
      contactPhone: p.contactPhone,
      seatsAvailable: p.seatsAvailable,
      score: Number(score.toFixed(3)),
      rationale: rationalePhrase(language, reasons, {
        sector: p.sector ?? undefined,
        district: p.district ?? undefined,
      }),
    };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}
