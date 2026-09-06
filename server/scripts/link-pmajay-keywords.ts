/**
 * Populates PmajayCourse `keywords` in prisma/data/pmajay-courses.json by
 * matching each course's title text against the existing skill lexicon
 * (services/skillLexicon.ts) — the same convention already used for
 * NsqfQualification.keywords. Deterministic and safe to re-run any time the
 * lexicon or the course data changes.
 *
 * Run: npx tsx scripts/link-pmajay-keywords.ts   (from server/)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SKILL_LEXICON } from "../src/services/skillLexicon.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface Course {
  srNo: number;
  courseLevel: string;
  sector: string;
  subSector: string;
  courseName: string;
  subCourseCode: string;
  subCourseName: string;
  keywords: string[];
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

const DATA_PATH = path.join(__dirname, "..", "prisma", "data", "pmajay-courses.json");
const courses: Course[] = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));

// Only Latin, reasonably specific patterns (>=4 chars, <=2 words) are usable
// against English PM-AJAY course titles.
// Speech patterns describe how a beneficiary TALKS ("madhumakhi palan");
// titleTerms describe how the catalogue WRITES the same trade ("Honey bee
// Farmer"). Catalogue rows are titles, so both are needed here — without
// titleTerms whole trades (beekeeping, sericulture, bar-bending) match no
// qualification at all and become unreachable for the voice pipeline.
const conceptPatterns = SKILL_LEXICON.map((entry) => ({
  normalized: entry.normalized,
  patterns: [...entry.patterns, ...(entry.titleTerms ?? [])]
    .filter((p) => isLatinText(p) && p.length >= 4 && normalizeText(p).split(" ").length <= 2)
    .map((p) => normalizeText(p).split(" ").filter(Boolean)),
}));

// Whole-word matching only — plain substring matching false-positives badly
// on formal course-title text (e.g. the "pottery" pattern "chak" matching
// inside "Panchakarma", which has nothing to do with pottery).
function matchesWholeWord(hayWords: string[], patternWords: string[]): boolean {
  return patternWords.every((pw) => hayWords.includes(pw));
}

let matchedCourses = 0;
const conceptHitCounts = new Map<string, number>();

for (const course of courses) {
  const hay = normalizeText(`${course.courseName} ${course.subSector} ${course.subCourseName}`);
  const hayWords = hay.split(" ").filter(Boolean);
  const hits = new Set<string>();
  for (const { normalized, patterns } of conceptPatterns) {
    if (patterns.some((pw) => matchesWholeWord(hayWords, pw))) {
      hits.add(normalized);
    }
  }
  course.keywords = [...hits];
  if (hits.size > 0) {
    matchedCourses += 1;
    for (const h of hits) conceptHitCounts.set(h, (conceptHitCounts.get(h) ?? 0) + 1);
  }
}

fs.writeFileSync(DATA_PATH, JSON.stringify(courses, null, 2));

console.log("courses with >=1 keyword:", matchedCourses, "/", courses.length);
console.log("distinct lexicon concepts matched:", conceptHitCounts.size, "/", SKILL_LEXICON.length);
console.log(
  "per-concept hit counts:",
  Object.fromEntries([...conceptHitCounts.entries()].sort((a, b) => b[1] - a[1])),
);
