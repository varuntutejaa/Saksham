import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { SKILL_LEXICON } from "../services/skillLexicon.js";

export const adminRouter = Router();

adminRouter.use(authenticate, requireRole("ADMIN"));

/** GET /api/admin/stats — headline numbers for the dashboard */
adminRouter.get("/stats", async (_req, res) => {
  const [sessions, users, recommendations, byStatus, byLanguage, bySector, lowBandwidth] =
    await Promise.all([
      prisma.voiceSession.count(),
      prisma.user.count({ where: { role: "BENEFICIARY" } }),
      prisma.recommendation.count(),
      prisma.recommendation.groupBy({ by: ["status"], _count: true }),
      prisma.voiceSession.groupBy({ by: ["language"], _count: true }),
      prisma.skillMapping.groupBy({ by: ["normalizedSkill"], _count: true }),
      prisma.voiceSession.count({ where: { bandwidthKbps: { lte: 256 } } }),
    ]);

  const enrolled =
    byStatus.find((s) => s.status === "ENROLLED")?._count ?? 0;
  const applied = byStatus.find((s) => s.status === "APPLIED")?._count ?? 0;

  res.json({
    totals: { sessions, beneficiaries: users, recommendations, lowBandwidthSessions: lowBandwidth },
    funnel: {
      suggested: recommendations,
      viewed: byStatus.find((s) => s.status === "VIEWED")?._count ?? 0,
      interested: byStatus.find((s) => s.status === "INTERESTED")?._count ?? 0,
      applied,
      enrolled,
      conversionRate: recommendations ? Number((enrolled / recommendations).toFixed(3)) : 0,
    },
    byStatus,
    byLanguage,
    topSkills: bySector.sort((a, b) => b._count - a._count).slice(0, 10),
  });
});

/** GET /api/admin/sessions?take=&skip=&state=&language= */
adminRouter.get("/sessions", async (req, res) => {
  const take = Math.min(Number(req.query.take ?? 50), 200);
  const skip = Number(req.query.skip ?? 0);
  const where = {
    ...(req.query.state ? { state: String(req.query.state) } : {}),
    ...(req.query.language ? { language: req.query.language as any } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.voiceSession.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, phone: true, district: true } },
        mappings: { include: { nsqfQualification: true } },
        recommendations: { include: { pmajayCourse: true, trainingProgram: true } },
      },
      orderBy: { createdAt: "desc" },
      take,
      skip,
    }),
    prisma.voiceSession.count({ where }),
  ]);
  res.json({ total, take, skip, items });
});

/** GET /api/admin/geo — session counts by state for a choropleth */
adminRouter.get("/geo", async (_req, res) => {
  const rows = await prisma.voiceSession.groupBy({
    by: ["state"],
    _count: true,
  });
  res.json(rows.filter((r) => r.state));
});

/** POST /api/admin/programs — create a training programme */
adminRouter.post("/programs", async (req, res) => {
  const schema = z.object({
    name: z.string().min(2),
    nameHindi: z.string().optional(),
    scheme: z.string().default("PM-AJAY"),
    component: z.string().optional(),
    providerName: z.string().optional(),
    nsqfQualificationId: z.string().optional(),
    sector: z.string().optional(),
    nsqfLevel: z.number().int().optional(),
    mode: z.enum(["OFFLINE", "ONLINE", "HYBRID"]).default("OFFLINE"),
    durationWeeks: z.number().int().optional(),
    stipend: z.boolean().default(false),
    certification: z.string().optional(),
    state: z.string().optional(),
    district: z.string().optional(),
    address: z.string().optional(),
    contactPhone: z.string().optional(),
    seatsTotal: z.number().int().optional(),
    seatsAvailable: z.number().int().optional(),
    eligibilityNote: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const created = await prisma.trainingProgram.create({ data: parsed.data });
  res.status(201).json(created);
});

/** PATCH /api/admin/programs/:id */
adminRouter.patch("/programs/:id", async (req, res) => {
  try {
    const updated = await prisma.trainingProgram.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(updated);
  } catch {
    res.status(404).json({ error: "Not found" });
  }
});

/** GET /api/admin/skill-tokens — the full normalized-skill vocabulary the
 *  voice pipeline understands (services/skillLexicon.ts). A posting whose
 *  skillTokens aren't from this list can never match a beneficiary's spoken
 *  skill, so the admin picker is restricted to it rather than free text. */
adminRouter.get("/skill-tokens", (_req, res) => {
  res.json(SKILL_LEXICON.map((e) => e.normalized).sort());
});

/**
 * GET /api/admin/job-postings/suggest?skillToken=pottery — recommendations to
 * help an admin fill in a posting for this trade: the real NSQF
 * qualification(s) it maps to (the same `keywords` lookup the voice pipeline
 * itself uses, so this is provably in sync with matching behaviour, not a
 * guess), the real job titles those qualifications lead to
 * (proposedOccupations), and which PM-AJAY scheme/component + real course
 * names fund training for that sector — the "which yojana are we targeting"
 * context.
 */
adminRouter.get("/job-postings/suggest", async (req, res) => {
  const skillToken = String(req.query.skillToken ?? "").toLowerCase();
  if (!skillToken) return res.status(400).json({ error: "skillToken is required" });

  const qualifications = await prisma.nsqfQualification.findMany({
    where: { expired: false, keywords: { has: skillToken } },
    orderBy: { nsqfLevel: "asc" },
    take: 5,
  });
  const sectors = [...new Set(qualifications.map((q) => q.sector))];

  const [schemeRows, pmajayCourses] = await Promise.all([
    sectors.length
      ? prisma.trainingProgram.findMany({
          where: { active: true, sector: { in: sectors } },
          select: { scheme: true, component: true, sector: true },
          distinct: ["scheme", "component"],
          take: 10,
        })
      : Promise.resolve([]),
    sectors.length
      ? prisma.pmajayCourse.findMany({
          where: { sector: { in: sectors } },
          select: { courseName: true, subCourseName: true, sector: true, courseLevel: true },
          take: 10,
        })
      : Promise.resolve([]),
  ]);

  res.json({
    qualifications: qualifications.map((q) => ({
      id: q.id,
      qpCode: q.qpCode,
      title: q.title,
      sector: q.sector,
      nsqfLevel: q.nsqfLevel,
    })),
    suggestedTitles: [...new Set(qualifications.flatMap((q) => q.proposedOccupations))].slice(0, 8),
    sectors,
    schemes: schemeRows,
    pmajayCourses,
  });
});

const jobPostingSchema = z.object({
  title: z.string().min(2),
  titleHindi: z.string().optional(),
  employerName: z.string().min(2),
  skillTokens: z.array(z.string()).min(1),
  nsqfQualificationId: z.string().optional(),
  sector: z.string().optional(),
  nsqfLevel: z.number().int().optional(),
  state: z.string().optional(),
  district: z.string().optional(),
  wageMin: z.number().int().optional(),
  wageMax: z.number().int().optional(),
  positions: z.number().int().default(1),
  contactPhone: z.string().optional(),
  description: z.string().optional(),
  active: z.boolean().default(true),
});

/** GET /api/admin/job-postings — every posting (including inactive and
 *  SAMPLE demonstration rows), for the admin job-postings manager. */
adminRouter.get("/job-postings", async (_req, res) => {
  const jobs = await prisma.jobPosting.findMany({
    include: { nsqfQualification: true },
    orderBy: { postedAt: "desc" },
  });
  res.json(jobs);
});

/** POST /api/admin/job-postings — create a real vacancy (source: EMPLOYER) */
adminRouter.post("/job-postings", async (req, res) => {
  const parsed = jobPostingSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const created = await prisma.jobPosting.create({
    data: { ...parsed.data, source: "EMPLOYER" },
    include: { nsqfQualification: true },
  });
  res.status(201).json(created);
});

/** PATCH /api/admin/job-postings/:id */
adminRouter.patch("/job-postings/:id", async (req, res) => {
  const parsed = jobPostingSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  try {
    const updated = await prisma.jobPosting.update({
      where: { id: req.params.id },
      data: parsed.data,
      include: { nsqfQualification: true },
    });
    res.json(updated);
  } catch {
    res.status(404).json({ error: "Not found" });
  }
});

/** DELETE /api/admin/job-postings/:id */
adminRouter.delete("/job-postings/:id", async (req, res) => {
  try {
    await prisma.jobPosting.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch {
    res.status(404).json({ error: "Not found" });
  }
});
