import { prisma } from "../lib/prisma.js";
import { extractSkills } from "./skillLexicon.js";

export interface MappingResult {
  rawSkillText: string;
  normalizedSkill: string;
  nsqfQualificationId: string | null;
  qpCode: string | null;
  title: string | null;
  sector: string | null;
  nsqfLevel: number | null;
  confidence: number;
  method: "keyword" | "embedding" | "llm" | "manual";
  /** true if this normalizedSkill also has a real, currently PM-AJAY-funded
   *  course (prisma/data/README-pmajay-courses.md) — independent of, and not
   *  required for, the NSQF match above. */
  pmajayVerified: boolean;
  pmajayCourse: { subCourseCode: string; subCourseName: string; sector: string } | null;
}

/**
 * Map a raw transcript to NSQF qualifications.
 *
 * Strategy (transparent, offline-capable):
 *  1. Pull normalized skill tokens from the lexicon.
 *  2. For each token, find the NsqfQualification whose `keywords` array contains it.
 *  3. Confidence = keyword overlap ratio, capped at 0.95 so nothing looks certain.
 *  4. Separately, check the real PM-AJAY course catalogue for the same token —
 *     this is an independent real-data signal, not a scoring input.
 */
export async function mapTranscriptToNsqf(transcript: string): Promise<MappingResult[]> {
  const tokens = extractSkills(transcript);
  if (tokens.length === 0) {
    return [
      {
        rawSkillText: transcript,
        normalizedSkill: "unknown",
        nsqfQualificationId: null,
        qpCode: null,
        title: null,
        sector: null,
        nsqfLevel: null,
        confidence: 0,
        method: "keyword",
        pmajayVerified: false,
        pmajayCourse: null,
      },
    ];
  }

  const [quals, pmajayCourses] = await Promise.all([
    prisma.nsqfQualification.findMany(),
    prisma.pmajayCourse.findMany({ where: { keywords: { isEmpty: false } } }),
  ]);
  const results: MappingResult[] = [];

  for (const token of tokens) {
    // Now that every one of the 1,283 rows carries keywords (not just ~64),
    // several can share a broad concept (e.g. "masonry" also matches generic
    // "construction" job titles like "Road Construction Engineer") — among
    // all real matches, prefer whichever title most directly names the
    // concept, so the qualification actually returned is the most
    // representative one, not just the first row Postgres happened to return.
    const qualCandidates = quals.filter((q) =>
      q.keywords.map((k) => k.toLowerCase()).includes(token.toLowerCase()),
    );
    const match =
      qualCandidates.find((q) => q.title.toLowerCase().includes(token.toLowerCase())) ?? qualCandidates[0];
    // Several courses can share a broad concept (e.g. "masonry" also matches
    // generic "construction" job titles) — among all real matches, prefer
    // whichever course title most directly names the concept itself, so the
    // example surfaced is the most representative one, not just the first
    // row Postgres happened to return.
    const pmajayCandidates = pmajayCourses.filter((c) =>
      c.keywords.map((k) => k.toLowerCase()).includes(token.toLowerCase()),
    );
    const pmajayMatch =
      pmajayCandidates.find((c) => c.subCourseName.toLowerCase().includes(token.toLowerCase())) ??
      pmajayCandidates[0];
    const pmajayCourse = pmajayMatch
      ? { subCourseCode: pmajayMatch.subCourseCode, subCourseName: pmajayMatch.subCourseName, sector: pmajayMatch.sector }
      : null;

    if (!match) {
      results.push({
        rawSkillText: transcript,
        normalizedSkill: token,
        nsqfQualificationId: null,
        qpCode: null,
        title: null,
        sector: null,
        nsqfLevel: null,
        confidence: 0.2,
        method: "keyword",
        pmajayVerified: Boolean(pmajayMatch),
        pmajayCourse,
      });
      continue;
    }

    const transcriptHits = match.keywords.filter((k) =>
      transcript.toLowerCase().includes(k.toLowerCase()),
    ).length;
    const confidence = Math.min(0.55 + 0.1 * transcriptHits, 0.95);

    results.push({
      rawSkillText: transcript,
      normalizedSkill: token,
      nsqfQualificationId: match.id,
      qpCode: match.qpCode,
      title: match.title,
      sector: match.sector,
      nsqfLevel: match.nsqfLevel,
      confidence,
      method: "keyword",
      pmajayVerified: Boolean(pmajayMatch),
      pmajayCourse,
    });
  }

  return results;
}
