import { prisma } from "../lib/prisma.js";
import { extractSkills, patternHitCount, titleTermsForSkill } from "./skillLexicon.js";
import { classifySkillsWithLlm } from "./skillLlm.js";

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
  for (const word of token.split(/[-\s]+/)) {
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
    const title = normalizeTitle(titleOf(candidate));
    let score = 0;
    // naming the trade at all is the dominant signal
    if (title.includes(normalizeTitle(token))) score += 10;
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

function normalizeTitle(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeSectorForFallback(value: string): string {
  return value.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "");
}

function cleanDisplayTitle(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/** The only qualification columns the mapping reads. */
const QUAL_FIELDS = {
  id: true,
  qpCode: true,
  title: true,
  sector: true,
  nsqfLevel: true,
  keywords: true,
  proposedOccupations: true,
} as const;

/** The NSQF + PM-AJAY catalogues, cached in-process.
 *
 *  This is government reference data: it only changes when the service is
 *  redeployed and reseeded, but it was being refetched in full on every single
 *  request — ~2,400 rows over the network, which dominated response time on
 *  Render's free tier. Cached for an hour; a redeploy restarts the process and
 *  therefore clears it. */
let catalogCache: {
  quals: QualRow[];
  expiredQuals: QualRow[];
  pmajayCourses: CourseRow[];
  fetchedAt: number;
} | null = null;
const CATALOG_TTL_MS = 60 * 60 * 1000;

async function loadCatalog() {
  if (catalogCache && Date.now() - catalogCache.fetchedAt < CATALOG_TTL_MS) return catalogCache;
  const [quals, expiredQuals, pmajayCourses] = await Promise.all([
    // Select only what the mapping actually reads. The full row carries the
    // scraped NQR detail blobs (nos, eligibility, progressionPathway); pulling
    // those for all 1,283 rows dominated response time.
    prisma.nsqfQualification.findMany({ where: { expired: false }, select: QUAL_FIELDS }),
    prisma.nsqfQualification.findMany({ where: { expired: true }, select: QUAL_FIELDS }),
    prisma.pmajayCourse.findMany({
      select: { subCourseCode: true, subCourseName: true, sector: true, keywords: true },
    }),
  ]);
  catalogCache = { quals, expiredQuals, pmajayCourses, fetchedAt: Date.now() };
  return catalogCache;
}

type QualRow = {
  id: string;
  qpCode: string;
  title: string;
  sector: string;
  nsqfLevel: number;
  keywords: string[];
  proposedOccupations: string[];
};
type CourseRow = { subCourseCode: string; subCourseName: string; sector: string; keywords: string[] };

const TRANSCRIPT_STOPWORDS = new Set([
  "about", "also", "and", "any", "are", "can", "does", "doing", "for", "from",
  "have", "help", "her", "him", "his", "job", "know", "learn", "like", "need",
  "operator", "please", "repair", "repairs", "service", "services", "she",
  "skill", "skills", "that", "the", "their", "them", "this", "want", "with",
  "make", "maker", "makes", "making", "work", "worker", "working", "would",
  "main", "maintenance", "maintain", "mera", "meri",
  "mere", "mujhe", "karta", "karti", "karte", "hoon", "hun", "hai", "hain",
]);

function lowerKeywords(keywords: string[]): string[] {
  return keywords.map((k) => k.toLowerCase());
}

function titleTermMatches(title: string, terms: string[]): boolean {
  const hay = normalizeTitle(title);
  return terms.some((term) => hay.includes(normalizeTitle(term)));
}

function qualificationCandidates(quals: QualRow[], token: string): { candidates: QualRow[]; pickToken: string } {
  const normalizedToken = token.toLowerCase();
  const keywordMatches = quals.filter((q) => lowerKeywords(q.keywords).includes(normalizedToken));
  const terms = titleTermsForSkill(token);
  const titleMatches = quals.filter((q) => titleTermMatches(q.title, terms));
  return { candidates: [...new Map([...titleMatches, ...keywordMatches].map((q) => [q.id, q])).values()], pickToken: terms[0] ?? token };
}

function courseCandidates(courses: CourseRow[], token: string): { candidates: CourseRow[]; pickToken: string } {
  const normalizedToken = token.toLowerCase();
  const keywordMatches = courses.filter((c) => lowerKeywords(c.keywords).includes(normalizedToken));
  const terms = titleTermsForSkill(token);
  const titleMatches = courses.filter((c) => titleTermMatches(c.subCourseName, terms) || titleTermMatches(c.sector, terms));
  return {
    candidates: [...new Map([...titleMatches, ...keywordMatches].map((c) => [c.subCourseCode, c])).values()],
    pickToken: terms[0] ?? token,
  };
}

function transcriptWords(transcript: string): string[] {
  return [
    ...new Set(
      normalizeTitle(transcript)
        .split(" ")
        .map((word) => spokenStem(word))
        .filter((word) => word.length >= 4 && !TRANSCRIPT_STOPWORDS.has(word)),
    ),
  ];
}

function spokenStem(word: string): string {
  if (word.length < 6) return word;
  return word.replace(/(ing|ed|er|ers|na|ta|ti|te|ya|ye|yi|ne)$/u, "");
}

function catalogFallbackMatch(transcript: string, quals: QualRow[]): { match: QualRow; score: number } | null {
  const words = transcriptWords(transcript);
  if (words.length === 0) return null;

  let best: { match: QualRow; score: number } | null = null;
  for (const qual of quals) {
    const title = normalizeTitle(qual.title);
    const occupations = normalizeTitle((qual.proposedOccupations ?? []).join(" "));
    const hay = `${title} ${occupations}`;
    let score = 0;

    for (const word of words) {
      if (new RegExp(`\\b${word}`, "i").test(hay)) score += 2;
      else if (word.length >= 5 && hay.includes(word)) score += 1;
    }
    if (score === 0) continue;
    score -= Math.max(0, qual.nsqfLevel - 4) * 0.2;

    if (!best || score > best.score) best = { match: qual, score };
  }

  return best && best.score >= 2 ? best : null;
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
  // Let the LLM interpret natural phrasing first when configured. It is still
  // constrained to known catalogue tokens; keyword and catalogue matching stay
  // as deterministic fallbacks for local/no-key development.
  const llmTokens = await classifySkillsWithLlm(transcript);
  const keywordTokens = extractSkills(transcript);
  let matchedByLlm = llmTokens.length > 0;
  let tokens = matchedByLlm ? llmTokens : keywordTokens;
  if (tokens.length === 0) {
    const { quals, pmajayCourses } = await loadCatalog();
    const fallback = catalogFallbackMatch(transcript, quals);
    if (fallback) {
      const course = pickBestByTitle(
        pmajayCourses.filter((c) => normalizeSectorForFallback(c.sector) === normalizeSectorForFallback(fallback.match.sector)),
        fallback.match.title,
        (c) => c.subCourseName,
      );
      return [
        {
          rawSkillText: transcript,
          normalizedSkill: normalizeTitle(fallback.match.title).replace(/\s+/g, "-"),
          nsqfQualificationId: fallback.match.id,
          qpCode: fallback.match.qpCode,
          title: cleanDisplayTitle(fallback.match.title),
          sector: fallback.match.sector,
          nsqfLevel: fallback.match.nsqfLevel,
          confidence: Math.min(0.55, 0.35 + fallback.score * 0.05),
          method: "keyword",
          pmajayVerified: Boolean(course),
          pmajayCourse: course
            ? { subCourseCode: course.subCourseCode, subCourseName: course.subCourseName, sector: course.sector }
            : null,
          nsqfExpired: false,
          proposedOccupations: fallback.match.proposedOccupations ?? [],
        },
      ];
    }

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

  const { quals, expiredQuals, pmajayCourses } = await loadCatalog();
  const results: MappingResult[] = [];

  for (const token of tokens) {
    // Now that every one of the 1,283 rows carries keywords (not just ~64),
    // several can share a broad concept (e.g. "masonry" also matches generic
    // "construction" job titles like "Road Construction Engineer") — among
    // all real matches, prefer whichever title most directly names the
    // concept, so the qualification actually returned is the most
    // representative one, not just the first row Postgres happened to return.
    const activeQuals = qualificationCandidates(quals, token);
    let match = pickBestByTitle(activeQuals.candidates, activeQuals.pickToken, (q) => q.title, (q) => q.nsqfLevel);
    let matchExpired = false;
    if (!match) {
      const expired = qualificationCandidates(expiredQuals, token);
      match = pickBestByTitle(expired.candidates, expired.pickToken, (q) => q.title, (q) => q.nsqfLevel);
      matchExpired = Boolean(match);
    }
    // Several courses can share a broad concept (e.g. "masonry" also matches
    // generic "construction" job titles) — among all real matches, prefer
    // whichever course title most directly names the concept itself, so the
    // example surfaced is the most representative one, not just the first
    // row Postgres happened to return.
    const pmajay = courseCandidates(pmajayCourses, token);
    const pmajayMatch = pickBestByTitle(pmajay.candidates, pmajay.pickToken, (c) => c.subCourseName);
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
    // an LLM match is a genuine reading of what they said, but it is inferred
    // rather than a literal phrase hit, so it does not claim keyword certainty
    const confidence = matchedByLlm
      ? 0.6
      : Math.min(0.55 + 0.1 * (qualificationHits + spokenHits), 0.95);

    results.push({
      rawSkillText: transcript,
      normalizedSkill: token,
      nsqfQualificationId: match.id,
      qpCode: match.qpCode,
      title: cleanDisplayTitle(match.title),
      sector: match.sector,
      nsqfLevel: match.nsqfLevel,
      confidence,
      method: matchedByLlm ? "llm" : "keyword",
      pmajayVerified: Boolean(pmajayMatch),
      pmajayCourse,
      nsqfExpired: matchExpired,
      proposedOccupations: match.proposedOccupations ?? [],
    });
  }

  return results;
}
