/**
 * Populates NsqfQualification.keywords for every one of the 1,283 real rows
 * in prisma/data/nsqf-qualifications.json — previously only ~64 rows had a
 * non-empty `keywords` (one hand-picked qualification per lexicon concept).
 *
 * Two passes:
 *  1. Whole-word match each qualification's title against every concept in
 *     services/skillLexicon.ts (same method as link-pmajay-keywords.ts) —
 *     ALL matching concepts are kept, not just the first, so a qualification
 *     genuinely covering two trades gets both. This is the set of keywords
 *     the live voice pipeline (extractSkills -> mapTranscriptToNsqf) can
 *     actually reach today.
 *  2. Any qualification still unmatched gets a fallback keyword: its own
 *     title, lowercased and stripped of generic seniority words (Assistant/
 *     Junior/Senior/Helper/Trainee/Apprentice) and grade markers (Level 1,
 *     Grade II, roman numerals). This is NOT reachable by today's fixed
 *     ~80-concept lexicon (extractSkills never emits an arbitrary title as a
 *     token) — it exists so no row is left with an empty array, and as a
 *     foundation for a future title-search feature. Documented honestly in
 *     prisma/data/README.md; don't mistake pass-2 keywords for voice-matchable
 *     ones.
 *
 * Run: npx tsx scripts/link-nsqf-keywords.ts   (from server/)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SKILL_LEXICON } from "../src/services/skillLexicon.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface NsqfRow {
  qpCode: string;
  title: string;
  titleHindi: string | null;
  sector: string;
  nsqfLevel: number;
  ssc: string | null;
  notionalHours: number | null;
  keywords: string[];
  nqrId: number;
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFC")
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isLatinText(value: string): boolean {
  return /^[a-z0-9\s]+$/.test(value);
}

function matchesWholeWord(hayWords: string[], patternWords: string[]): boolean {
  return patternWords.every((pw) => hayWords.includes(pw));
}

const GENERIC_WORDS = new Set([
  "assistant", "junior", "senior", "helper", "trainee", "apprentice",
  "level", "grade", "i", "ii", "iii", "iv", "v", "1", "2", "3", "4", "5",
]);

function fallbackKeyword(title: string): string {
  const words = normalizeText(title).split(" ").filter((w) => w && !GENERIC_WORDS.has(w));
  const cleaned = words.join(" ").trim();
  return cleaned || normalizeText(title);
}

const DATA_PATH = path.join(__dirname, "..", "prisma", "data", "nsqf-qualifications.json");
const rows: NsqfRow[] = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));

const conceptPatterns = SKILL_LEXICON.map((entry) => ({
  normalized: entry.normalized,
  patterns: entry.patterns
    .filter((p) => isLatinText(p) && p.length >= 4 && normalizeText(p).split(" ").length <= 2)
    .map((p) => normalizeText(p).split(" ").filter(Boolean)),
}));

let lexiconMatched = 0;
let fallbackUsed = 0;
const conceptHitCounts = new Map<string, number>();

for (const row of rows) {
  // title only — including `sector` here badly over-matches, since NSQF's
  // sector field is broad (e.g. "Construction" covers electrical,
  // fabrication, BIM, scaffolding, not just masonry) and would tag every
  // row in a sector with any concept that happens to share a generic
  // pattern like "construction".
  const hay = normalizeText(row.title);
  const hayWords = hay.split(" ").filter(Boolean);
  const hits = new Set<string>();
  for (const { normalized, patterns } of conceptPatterns) {
    if (patterns.some((pw) => matchesWholeWord(hayWords, pw))) {
      hits.add(normalized);
    }
  }
  if (hits.size > 0) {
    row.keywords = [...hits];
    lexiconMatched += 1;
    for (const h of hits) conceptHitCounts.set(h, (conceptHitCounts.get(h) ?? 0) + 1);
  } else {
    row.keywords = [fallbackKeyword(row.title)];
    fallbackUsed += 1;
  }
}

fs.writeFileSync(DATA_PATH, JSON.stringify(rows, null, 2));

console.log("total rows:", rows.length);
console.log("matched a real lexicon concept (voice-matchable today):", lexiconMatched);
console.log("fell back to title-derived keyword (not yet voice-matchable):", fallbackUsed);
console.log("distinct lexicon concepts matched:", conceptHitCounts.size, "/", SKILL_LEXICON.length);
console.log(
  "per-concept hit counts:",
  Object.fromEntries([...conceptHitCounts.entries()].sort((a, b) => b[1] - a[1])),
);
