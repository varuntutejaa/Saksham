import { prisma } from "../lib/prisma.js";

export interface EligibilityResult {
  eligible: {
    job: { id: string; title: string; titleHindi: string | null; sector: string | null };
  }[];
  almostEligible: {
    job: { id: string; title: string; titleHindi: string | null; sector: string | null };
    missingQualifications: { id: string; qpCode: string; title: string; titleHindi: string | null }[];
  }[];
}

/**
 * A beneficiary is treated as holding a qualification once any of their voice
 * sessions has been mapped to it (SkillMapping.nsqfQualificationId) — there is
 * no separate "certificate issued" record in the data model today, so this is
 * the closest real signal available. A job is "eligible" once every one of
 * its JobRequirement rows is covered; otherwise it's "almost eligible" with
 * the specific missing qualifications listed, so the UI can say
 * "complete X to become eligible for this job".
 */
export async function computeEligibility(userId: string): Promise<EligibilityResult> {
  const [heldMappings, jobs] = await Promise.all([
    prisma.skillMapping.findMany({
      where: { session: { userId }, nsqfQualificationId: { not: null } },
      select: { nsqfQualificationId: true },
      distinct: ["nsqfQualificationId"],
    }),
    prisma.job.findMany({
      where: { active: true },
      include: { requirements: { include: { nsqfQualification: true } } },
    }),
  ]);

  const heldIds = new Set(heldMappings.map((m) => m.nsqfQualificationId as string));

  const eligible: EligibilityResult["eligible"] = [];
  const almostEligible: EligibilityResult["almostEligible"] = [];

  for (const job of jobs) {
    if (job.requirements.length === 0) continue; // a job with no requirements isn't a meaningful match
    const missing = job.requirements.filter((r) => !heldIds.has(r.nsqfQualificationId));
    const jobSummary = { id: job.id, title: job.title, titleHindi: job.titleHindi, sector: job.sector };
    if (missing.length === 0) {
      eligible.push({ job: jobSummary });
    } else {
      almostEligible.push({
        job: jobSummary,
        missingQualifications: missing.map((m) => ({
          id: m.nsqfQualification.id,
          qpCode: m.nsqfQualification.qpCode,
          title: m.nsqfQualification.title,
          titleHindi: m.nsqfQualification.titleHindi,
        })),
      });
    }
  }

  return { eligible, almostEligible };
}
