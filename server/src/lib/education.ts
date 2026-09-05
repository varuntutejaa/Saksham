/**
 * The education ladder shared by the app's voice onboarding and NQR's
 * free-text entry requirements, so "can this beneficiary actually enrol?" is
 * answerable. Used by the NSQF detail loader (scripts/apply-nsqf-details.ts)
 * and the seed.
 */
export const EDUCATION_RANK = {
  none: 0,
  below_10th: 1,
  "10th": 2,
  "12th": 3,
  iti_diploma: 4,
  undergrad: 5,
  postgrad: 6,
} as const;

export type EducationLevel = keyof typeof EDUCATION_RANK;

/** Ordered — the first pattern that matches wins, so "3 year Diploma after
 *  10th" is read as a diploma, not as 10th. */
const EDUCATION_PATTERNS: [RegExp, EducationLevel][] = [
  [/\bPG\b|post[\s-]?grad|master/i, "postgrad"],
  [/diploma|\bITI\b/i, "iti_diploma"],
  [/\bUG\b|graduate|degree/i, "undergrad"],
  [/\b12th\b|\bXII\b|intermediate|senior secondary/i, "12th"],
  [/\b10th\b|\b11th\b|\bX\b|matric|secondary/i, "10th"],
  [/\b[5-9]th\b|\b(fifth|sixth|seventh|eighth|ninth)\b/i, "below_10th"],
  [/no formal education|ability to read|literate|^none$/i, "none"],
];

export function toEducationLevel(raw: string): EducationLevel | null {
  const text = raw.trim();
  if (!text) return null;
  // a prior NSQF qualification is a different entry route, not a school level
  if (/previous nsqf|nsqf qualification/i.test(text)) return null;
  for (const [pattern, level] of EDUCATION_PATTERNS) {
    if (pattern.test(text)) return level;
  }
  return null;
}

/** The most permissive entry requirement across a qualification's eligibility
 *  rows — meeting any one row qualifies a candidate. */
export function minEducationOf(eligibility: { criteria1: string }[]): EducationLevel | null {
  let best: EducationLevel | null = null;
  for (const row of eligibility) {
    const level = toEducationLevel(row.criteria1);
    if (!level) continue;
    if (best === null || EDUCATION_RANK[level] < EDUCATION_RANK[best]) best = level;
  }
  return best;
}
