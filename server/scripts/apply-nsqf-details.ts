/**
 * Loads prisma/data/nsqf-details.json (produced by scrape-nsqf-details.ts)
 * onto the NsqfQualification rows, matching on nqrId.
 *
 * Also denormalizes `minEducation` — the *lowest* entry bar across a
 * qualification's eligibility rows, since meeting any one row qualifies a
 * candidate. That's what makes "can this beneficiary actually enrol?"
 * answerable from the education we collect during voice onboarding.
 *
 *   npm run apply:nsqf-details
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../src/lib/prisma.js";
import type { NsqfDetail } from "./scrape-nsqf-details.js";
import { minEducationOf } from "../src/lib/education.js";

const DETAILS = join(import.meta.dirname, "..", "prisma", "data", "nsqf-details.json");

function toDate(iso: string | null): Date | null {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** DD/MM/YYYY -> Date */
function parseDdMmYyyy(value: string | null): Date | null {
  const m = value?.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  return m ? toDate(`${m[3]}-${m[2]}-${m[1]}`) : null;
}

async function main() {
  const details = JSON.parse(readFileSync(DETAILS, "utf8")) as Record<string, NsqfDetail>;
  const rows = Object.values(details);
  console.log(`${rows.length} scraped detail records`);

  let updated = 0;
  let missing = 0;
  const today = new Date().toISOString().slice(0, 10);

  // one round trip per row against a remote Postgres is slow; run them in
  // batches so a full load is a minute rather than the better part of an hour
  const BATCH = 25;
  async function applyOne(detail: NsqfDetail) {
    const validTill = parseDdMmYyyy(detail.validTill);
    const result = await prisma.nsqfQualification.updateMany({
      where: { nqrId: detail.nqrId },
      data: {
        description: detail.jobDescription,
        eligibility: detail.eligibility.length ? (detail.eligibility as object[]) : undefined,
        minEducation: minEducationOf(detail.eligibility),
        progressionPathway: detail.progressionPathway,
        nos: detail.nos.length ? (detail.nos as object[]) : undefined,
        nsqcNumber: detail.nsqcNumber,
        approvedOn: parseDdMmYyyy(detail.approvedOn),
        validTill,
        expired: detail.validTillIso ? detail.validTillIso < today : false,
        notionalHoursMin: detail.notionalHoursMin,
        notionalHoursMax: detail.notionalHoursMax,
        theoryHours: detail.theoryHours,
        practicalHours: detail.practicalHours,
        employabilityHours: detail.employabilityHours,
        ojtHours: detail.ojtHours,
        awardingBodies: detail.awardingBodies,
        organisationType: detail.organisationType,
        certifyingBodies: detail.certifyingBodies,
        proposedOccupations: detail.proposedOccupations,
        qualificationType: detail.qualificationType,
        applicability: detail.applicability,
        detailsScrapedAt: new Date(detail.scrapedAt),
      },
    });
    if (result.count === 0) missing++;
    else updated += result.count;
  }

  for (let i = 0; i < rows.length; i += BATCH) {
    await Promise.all(rows.slice(i, i + BATCH).map(applyOne));
    if ((i / BATCH) % 8 === 0) console.log(`  ${Math.min(i + BATCH, rows.length)}/${rows.length}`);
  }

  console.log(`updated ${updated} qualifications (${missing} nqrIds had no matching row)`);

  const [total, expired, withElig, withOcc, withDesc] = await Promise.all([
    prisma.nsqfQualification.count(),
    prisma.nsqfQualification.count({ where: { expired: true } }),
    prisma.nsqfQualification.count({ where: { minEducation: { not: null } } }),
    prisma.nsqfQualification.count({ where: { proposedOccupations: { isEmpty: false } } }),
    prisma.nsqfQualification.count({ where: { description: { not: null } } }),
  ]);
  console.log(`\n  total:                ${total}`);
  console.log(`  EXPIRED (excluded):   ${expired}`);
  console.log(`  LIVE:                 ${total - expired}`);
  console.log(`  with entry education: ${withElig}`);
  console.log(`  with occupations:     ${withOcc}`);
  console.log(`  with job description: ${withDesc}`);
}

if (process.argv[1] && import.meta.filename === process.argv[1]) {
  main()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
