/**
 * Diagnostic: for every normalized skill in the lexicon, report whether the
 * live pipeline can actually resolve it to (a) an NSQF qualification and
 * (b) a PM-AJAY course — and whether the NSQF match looks trade-correct.
 * Read-only. Run: npx tsx scripts/audit-coverage.ts
 */
import { PrismaClient } from "@prisma/client";
import { SKILL_LEXICON } from "../src/services/skillLexicon.js";
import { pickBestByTitle, tradeStems } from "../src/services/nsqf.js";

const prisma = new PrismaClient();

/** words that shouldn't count as evidence the title names the trade */
const GENERIC = new Set(["assistant","operator","technician","worker","general","other","helper","supervisor","executive"]);

function tradeWords(token: string): string[] {
  return token.split("-").filter((w) => w.length > 2);
}

/** does the qualification title plausibly name this trade? */
function titleNamesTrade(title: string, token: string): boolean {
  const t = title.toLowerCase();
  // stem-aware: an NQR title names the worker ("Mason"), not the craft ("masonry")
  return tradeStems(token).some((stem) => new RegExp(`\\b${stem}`, "i").test(t));
}

async function main() {
const [quals, courses] = await Promise.all([
  prisma.nsqfQualification.findMany({ select: { qpCode: true, title: true, sector: true, nsqfLevel: true, keywords: true, expired: true } }),
  prisma.pmajayCourse.findMany({ select: { subCourseName: true, sector: true, keywords: true } }),
]);

const live = quals.filter((q) => !q.expired);
const rows: any[] = [];

for (const { normalized } of SKILL_LEXICON) {
  const tok = normalized.toLowerCase();
  const liveCands = live.filter((q) => q.keywords.map((k) => k.toLowerCase()).includes(tok));
  const expiredCands = quals.filter((q) => q.expired && q.keywords.map((k) => k.toLowerCase()).includes(tok));
  // same selection rule the service uses today
  // use the REAL selector the service uses, so the audit measures shipped
  // behaviour rather than a copy of it that can drift
  const chosen = pickBestByTitle(liveCands, tok, (q) => q.title, (q) => q.nsqfLevel);
  const pmCands = courses.filter((c) => c.keywords.map((k) => k.toLowerCase()).includes(tok));

  // mirror the service: a live qualification wins; if none exists we fall back
  // to the expired one and flag it, rather than returning nothing
  const fallback = chosen ?? pickBestByTitle(expiredCands, tok, (q) => q.title, (q) => q.nsqfLevel);
  let status: string;
  if (!fallback) status = "NO-NSQF";
  else if (!titleNamesTrade(fallback.title, tok)) status = "SUSPECT";
  else if (!chosen) status = "OK-VIA-EXPIRED";
  else status = "OK";

  rows.push({
    token: normalized,
    status,
    nsqf: fallback ? `${!chosen ? "(lapsed) " : ""}${fallback.qpCode} · ${fallback.title}` : "—",
    liveCands: liveCands.length,
    expiredCands: expiredCands.length,
    pmCourses: pmCands.length,
  });
}

const by = (s: string) => rows.filter((r) => r.status === s);
console.log(`\nTOTAL TRADES: ${rows.length}`);
console.log(`  OK            ${by("OK").length}`);
console.log(`  SUSPECT       ${by("SUSPECT").length}   (matched, but title doesn't name the trade)`);
console.log(`  OK-VIA-EXPIRED ${by("OK-VIA-EXPIRED").length}  (no live QP; correctly falls back to a lapsed one, flagged)`);
console.log(`  NO-NSQF       ${by("NO-NSQF").length}   (no qualification carries this keyword at all)`);
console.log(`  no PM course  ${rows.filter((r) => r.pmCourses === 0).length}`);

for (const s of ["NO-NSQF", "SUSPECT", "OK-VIA-EXPIRED", "OK"]) {
  console.log(`\n=== ${s} ===`);
  for (const r of by(s)) {
    console.log(`  ${r.token.padEnd(24)} live:${String(r.liveCands).padStart(3)} exp:${String(r.expiredCands).padStart(3)} pm:${String(r.pmCourses).padStart(4)}  ${r.nsqf.slice(0, 70)}`);
  }
}
await prisma.$disconnect();
}
main();
