import { prisma } from "../lib/prisma.js";
import type { Language } from "@prisma/client";
import { rationalePhrase } from "./i18n.js";
import type { MappingResult } from "./nsqf.js";

export interface CourseRecommendation {
  pmajayCourseId: string;
  subCourseCode: string;
  subCourseName: string;
  courseName: string;
  sector: string;
  subSector: string;
  courseLevel: string;
  /** the NSQF qualification the beneficiary's skill mapped to, when there was one */
  nsqfQpCode: string | null;
  nsqfTitle: string | null;
  nsqfLevel: number | null;
  score: number;
  rationale: string;
}

export type Intent = "jobs" | "training" | "certificate" | "guidance";

interface RecommendInput {
  mappings: MappingResult[];
  state?: string | null;
  district?: string | null;
  language?: Language;
  /** What the beneficiary asked for. Re-weights the ranking; never filters, so
   *  the full livelihood map stays visible whichever option they picked. */
  intent?: Intent;
}

/** The two real datasets spell sectors differently — NSQF says
 *  "Handicrafts & Carpet", the PM-AJAY catalogue says "Handicrafts and Carpet".
 *  Compare them on a normalized form so the sector signal actually fires. */
function normalizeSector(sector: string): string {
  return sector.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "");
}

const TITLE_STOPWORDS = new Set([
  "including", "traditional", "tradtional", "product", "maker", "worker", "assistant",
  "operator", "general", "other", "service", "services", "based",
]);

/** Content words from the matched NSQF qualification title, used to prefer the
 *  course that names the same trade as the qualification the skill mapped to. */
function titleWords(title: string | null): string[] {
  if (!title) return [];
  return [
    ...new Set(
      title
        .toLowerCase()
        .split(/[^a-z]+/)
        .filter((w) => w.length > 4 && !TITLE_STOPWORDS.has(w)),
    ),
  ];
}

/** "State [ODISHA]" -> "odisha", so a course scoped to a state can be matched
 *  against the beneficiary's own state. */
function courseStateName(courseLevel: string): string | null {
  const match = courseLevel.match(/\[([^\]]+)\]/);
  return match ? match[1].trim().toLowerCase() : null;
}

function normalizeLocation(value: string | null | undefined): string | null {
  return value?.trim().toLowerCase().replace(/[^a-z0-9]+/g, "") || null;
}

/**
 * Recommend real PM-AJAY courses for a beneficiary.
 *
 * Scores the actual 2,366-row PM-AJAY course catalogue
 * (prisma/data/README-pmajay-courses.md) against the NSQF qualifications the
 * beneficiary's spoken skill mapped to — so both halves of a recommendation
 * are real government data, not sample rows.
 *
 * Score components (0–1, weighted):
 *   0.50  course keywords contain the normalized skill the beneficiary said
 *   0.20  course sector matches the mapped NSQF qualification's sector
 *   0.15  course title names the skill, or the same trade as the matched NSQF QP
 *   0.10  scoped to the beneficiary's own state, or nationally available
 *   0.05  the skill mapped to an NSQF qualification at all (auditable match)
 */
export async function recommendCourses(input: RecommendInput): Promise<CourseRecommendation[]> {
  const { mappings, state, language = "hi", intent = "guidance" } = input;

  const matched = mappings.filter((m) => m.normalizedSkill !== "unknown");
  const tokens = [...new Set(matched.map((m) => m.normalizedSkill.toLowerCase()))];
  const sectors = [...new Set(matched.map((m) => m.sector).filter((s): s is string => Boolean(s)))];
  if (tokens.length === 0 && sectors.length === 0) return [];

  const wantedSectors = new Set(sectors.map(normalizeSector));
  // "&"/"and" spellings differ between the two datasets, so widen the SQL filter
  // and settle the real comparison on the normalized form below.
  const sectorVariants = [...new Set(sectors.flatMap((s) => [s, s.replace(/ & /g, " and "), s.replace(/ and /g, " & ")]))];

  const candidates = await prisma.pmajayCourse.findMany({
    where: {
      OR: [
        ...(tokens.length ? [{ keywords: { hasSome: tokens } }] : []),
        ...(sectorVariants.length ? [{ sector: { in: sectorVariants } }] : []),
      ],
    },
    take: 300,
  });

  const beneficiaryState = normalizeLocation(state);

  const scored = candidates.map((course) => {
    const courseKeywords = course.keywords.map((k) => k.toLowerCase());
    const hitToken = tokens.find((token) => courseKeywords.includes(token));
    // the mapping that produced the hit — carries the NSQF qualification we
    // can show alongside the course, so the match stays auditable
    const source = matched.find((m) => m.normalizedSkill.toLowerCase() === hitToken) ?? matched[0];

    let score = 0;
    const reasons: string[] = [];

    if (hitToken) {
      score += 0.5;
      reasons.push("nsqf");
    }
    if (wantedSectors.has(normalizeSector(course.sector))) {
      score += 0.2;
      reasons.push("sector");
    }
    const courseTitle = course.subCourseName.toLowerCase();
    if (hitToken && courseTitle.includes(hitToken)) {
      score += 0.15;
    } else {
      // otherwise prefer courses naming the same trade as the matched NSQF QP
      const overlap = titleWords(source?.title ?? null).filter((w) => courseTitle.includes(w)).length;
      score += Math.min(0.15, overlap * 0.05);
    }

    const scopedState = courseStateName(course.courseLevel);
    const normalizedScopedState = normalizeLocation(scopedState);
    const locationRank =
      normalizedScopedState && beneficiaryState && beneficiaryState.includes(normalizedScopedState)
        ? 2
        : !normalizedScopedState
          ? 1
          : 0;

    if (locationRank === 2) {
      score += 0.1;
      reasons.push("state");
    } else if (locationRank === 1) {
      score += 0.1; // nationally available
    } else {
      score -= 0.15; // scoped to a state this beneficiary isn't in
    }

    if (source?.nsqfQualificationId) score += 0.05;

    // Intent re-weighting. Deliberately small (max 0.1) and additive: it
    // reorders the same candidate set rather than filtering it, so a
    // beneficiary who picked the "wrong" option still sees every option.
    if (intent === "jobs") {
      // Prefer courses whose title names one of the occupations this
      // qualification actually leads to — the closest thing to an employment
      // signal the catalogue holds (PmajayCourse has no vacancy/placement data).
      const occupations = (source?.proposedOccupations ?? []).map((o) => o.toLowerCase());
      if (occupations.some((o) => o && courseTitle.includes(o))) score += 0.1;
    } else if (intent === "certificate") {
      // Certifying an existing skill: prefer the course that names the trade
      // they already practise, over adjacent ones in the same sector.
      if (hitToken && courseTitle.includes(hitToken)) score += 0.1;
    }

    return {
      pmajayCourseId: course.id,
      subCourseCode: course.subCourseCode,
      subCourseName: course.subCourseName,
      courseName: course.courseName,
      sector: course.sector,
      subSector: course.subSector,
      courseLevel: course.courseLevel,
      nsqfQpCode: source?.qpCode ?? null,
      nsqfTitle: source?.title ?? null,
      nsqfLevel: source?.nsqfLevel ?? null,
      score: Number(Math.max(0, Math.min(1, score)).toFixed(3)),
      locationRank,
      rationale: rationalePhrase(language, reasons, { sector: course.sector }),
    };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.locationRank - a.locationRank || b.score - a.score)
    .slice(0, 5)
    .map(({ locationRank: _locationRank, ...recommendation }) => recommendation);
}
