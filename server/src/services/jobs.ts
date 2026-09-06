import { prisma } from "../lib/prisma.js";
import type { MappingResult } from "./nsqf.js";

export interface JobMatch {
  jobPostingId: string;
  title: string;
  titleHindi: string | null;
  employerName: string;
  sector: string | null;
  nsqfLevel: number | null;
  state: string | null;
  district: string | null;
  wageMin: number | null;
  wageMax: number | null;
  positions: number | null;
  contactPhone: string | null;
  /** where this row came from — SAMPLE rows are demonstration data and the
   *  client must label them as such, never as live vacancies */
  source: string;
  score: number;
  /** true when the job asks for a higher NSQF level than the beneficiary's
   *  mapped qualification — shown as "reachable with training", not as a
   *  job they can walk into today */
  needsUpskilling: boolean;
  /** the qualification that would bridge the gap, when needsUpskilling */
  nsqfQpCode: string | null;
  nsqfTitle: string | null;
}

interface MatchInput {
  mappings: MappingResult[];
  state?: string | null;
  district?: string | null;
  limit?: number;
}

function normalizeLocation(value: string | null | undefined): string | null {
  return value?.trim().toLowerCase().replace(/[^a-z0-9]+/g, "") || null;
}

/**
 * Match real job postings to a beneficiary's mapped skills.
 *
 * Jobs carry the SAME normalized skill tokens the voice pipeline emits
 * (services/skillLexicon.ts), so this is an exact join rather than fuzzy title
 * comparison — every trade the pipeline can map is a trade jobs can be found
 * for.
 *
 * Score (0–1):
 *   0.55  the job serves a skill the beneficiary actually said
 *   0.20  same district as the beneficiary  (0.10 for same state)
 *   0.15  the beneficiary already meets the NSQF level the job asks for
 *   0.10  sector matches the mapped qualification's sector
 */
export async function matchJobs(input: MatchInput): Promise<JobMatch[]> {
  const { mappings, state, district, limit = 8 } = input;

  const matched = mappings.filter((m) => m.normalizedSkill !== "unknown");
  const tokens = [...new Set(matched.map((m) => m.normalizedSkill.toLowerCase()))];
  if (tokens.length === 0) return [];

  const jobs = await prisma.jobPosting.findMany({
    where: { active: true, skillTokens: { hasSome: tokens } },
    take: 200,
  });

  const wantedSectors = new Set(matched.map((m) => m.sector).filter(Boolean).map((s) => s!.toLowerCase()));
  // the highest level the beneficiary has actually mapped to
  const beneficiaryLevel = Math.max(0, ...matched.map((m) => m.nsqfLevel ?? 0));
  const beneficiaryState = normalizeLocation(state);
  const beneficiaryDistrict = normalizeLocation(district);

  const scored = jobs.map((job) => {
    const hit = job.skillTokens.find((t) => tokens.includes(t.toLowerCase()));
    const source = matched.find((m) => m.normalizedSkill.toLowerCase() === hit?.toLowerCase()) ?? matched[0];

    let score = 0;
    if (hit) score += 0.55;

    const jobDistrict = normalizeLocation(job.district);
    const jobState = normalizeLocation(job.state);
    if (jobDistrict && beneficiaryDistrict && jobDistrict === beneficiaryDistrict) score += 0.2;
    else if (jobState && beneficiaryState && jobState === beneficiaryState) score += 0.1;

    const needsUpskilling = (job.nsqfLevel ?? 0) > beneficiaryLevel;
    if (!needsUpskilling) score += 0.15;

    if (job.sector && wantedSectors.has(job.sector.toLowerCase())) score += 0.1;

    return {
      jobPostingId: job.id,
      title: job.title,
      titleHindi: job.titleHindi,
      employerName: job.employerName,
      sector: job.sector,
      nsqfLevel: job.nsqfLevel,
      state: job.state,
      district: job.district,
      wageMin: job.wageMin,
      wageMax: job.wageMax,
      positions: job.positions,
      contactPhone: job.contactPhone,
      source: job.source,
      score: Number(Math.max(0, Math.min(1, score)).toFixed(3)),
      needsUpskilling,
      nsqfQpCode: source?.qpCode ?? null,
      nsqfTitle: source?.title ?? null,
    };
  });

  return scored
    // jobs they can take today rank above jobs needing training, then by score
    .sort((a, b) => Number(a.needsUpskilling) - Number(b.needsUpskilling) || b.score - a.score)
    .slice(0, limit);
}
