import { prisma } from "../lib/prisma.js";
import { extractSkills, patternHitCount } from "./skillLexicon.js";

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
  /** true when the matched qualification's NQR validity has lapsed. The match
   *  is still shown (many lapsed trades — pottery, basket-making — still have
   *  live PM-AJAY courses), but the client must label it so nobody is told an
   *  expired certification is current. */
  nsqfExpired: boolean;
  /** Real job titles this qualification leads to (NQR "proposed occupations").
   *  Populated for 1,170 of the 1,283 qualifications — this is the only
   *  employment-side data in the catalogue, so an intent of "find work"
   *  answers with these rather than with job listings, which we do not have. */
  proposedOccupations: string[];
}


/** Word stems for a normalized skill token, so "masonry" also recognises
 *  "Mason", "handloom-weaving" recognises "loom"/"weav". Trailing -ing/-ry/-y
 *  are dropped because NQR titles name the worker ("Mason"), not the craft. */
export function tradeStems(token: string): string[] {
  const stems: string[] = [];
  for (const word of token.split("-")) {
    if (word.length < 3) continue;
    stems.push(word);
    for (const suffix of ["ing", "ry", "y", "s"]) {
      if (word.length > suffix.length + 2 && word.endsWith(suffix)) {
        stems.push(word.slice(0, -suffix.length));
      }
    }
  }
  return [...new Set(stems)];
}

/** Titles naming a role the beneficiary is unlikely to hold. A PM-AJAY
 *  beneficiary is an informal worker, so an entry-level "Brick Mason- Basic"
 *  is a far better mapping than "Project Coordinator (Construction)". */
const SENIOR_TITLE = /\b(manager|supervisor|coordinator|engineer|executive|officer|specialist|analyst|architect|consultant|instructor|teacher|trainer)\b/i;

/** Pick the qualification/course whose title most directly names the trade.
 *  Falls back to the first candidate so behaviour never regresses to "no match". */
export function pickBestByTitle<T>(candidates: T[], token: string, titleOf: (item: T) => string, levelOf?: (item: T) => number | null): T | undefined {
  if (candidates.length === 0) return undefined;
  const stems = tradeStems(token);
  let best: T | undefined;
  let bestScore = -Infinity;
  for (const candidate of candidates) {
    const title = titleOf(candidate).toLowerCase();
    let score = 0;
    // naming the trade at all is the dominant signal
    if (title.includes(token.toLowerCase())) score += 10;
    for (const stem of stems) if (new RegExp(`\\b${stem}`, "i").test(title)) score += 6;
    // prefer the worker over the manager of the worker
    if (SENIOR_TITLE.test(title)) score -= 8;
    // prefer entry-level qualifications, which is who this app serves
    const level = levelOf?.(candidate);
    if (typeof level === "number") score -= Math.max(0, level - 3);
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }
  return best ?? candidates[0];
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
        nsqfExpired: false,
        proposedOccupations: [],
      },
    ];
  }

  const [quals, expiredQuals, pmajayCourses] = await Promise.all([
    // NQR qualifications genuinely expire. A live qualification always wins,
    // but for trades whose only QP has lapsed (pottery, basket weaving, stone
    // carving — exactly the traditional occupations this app serves) we fall
    // back to the expired row and flag it, rather than telling the beneficiary
    // their skill wasn't understood while PM-AJAY still funds that training.
    prisma.nsqfQualification.findMany({ where: { expired: false } }),
    prisma.nsqfQualification.findMany({ where: { expired: true } }),
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
    let match = pickBestByTitle(qualCandidates, token, (q) => q.title, (q) => q.nsqfLevel);
    let matchExpired = false;
    if (!match) {
      const expiredCandidates = expiredQuals.filter((q) =>
        q.keywords.map((k) => k.toLowerCase()).includes(token.toLowerCase()),
      );
      match = pickBestByTitle(expiredCandidates, token, (q) => q.title, (q) => q.nsqfLevel);
      matchExpired = Boolean(match);
    }
    // Several courses can share a broad concept (e.g. "masonry" also matches
    // generic "construction" job titles) — among all real matches, prefer
    // whichever course title most directly names the concept itself, so the
    // example surfaced is the most representative one, not just the first
    // row Postgres happened to return.
    const pmajayCandidates = pmajayCourses.filter((c) =>
      c.keywords.map((k) => k.toLowerCase()).includes(token.toLowerCase()),
    );
    const pmajayMatch = pickBestByTitle(pmajayCandidates, token, (c) => c.subCourseName);
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
        nsqfExpired: false,
        proposedOccupations: [],
      });
      continue;
    }

    // Confidence reflects how strongly the transcript evidences this skill.
    // The qualification's own keywords are mostly formal English ("pottery",
    // "terracotta"), so counting only those punished beneficiaries who speak
    // in their own language: "mitti ke bartan" scored 0 hits and floored at
    // the base, while "silai" happened to be a keyword and scored higher.
    // Count the LEXICON patterns that actually fired too — that is the real
    // evidence the beneficiary named this trade.
    const hay = transcript.toLowerCase();
    const qualificationHits = match.keywords.filter((k) => hay.includes(k.toLowerCase())).length;
    const spokenHits = patternHitCount(transcript, token);
    const confidence = Math.min(0.55 + 0.1 * (qualificationHits + spokenHits), 0.95);

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
      nsqfExpired: matchExpired,
      proposedOccupations: match.proposedOccupations ?? [],
    });
  }

  return results;
}
