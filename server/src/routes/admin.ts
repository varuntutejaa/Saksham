import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { SKILL_LEXICON } from "../services/skillLexicon.js";

export const adminRouter = Router();

adminRouter.use(authenticate, requireRole("ADMIN", "VIEWER"));
/** VIEWER can read every route below; only ADMIN can write. */
adminRouter.use((req, res, next) => {
  if (req.method === "GET" || req.auth!.role === "ADMIN") return next();
  res.status(403).json({ error: "Viewer accounts cannot make changes" });
});

/** Records one admin action to AuditLogEntry. Never blocks the response —
 *  a logging failure must not fail the action it's logging. */
function logAdmin(adminId: string, action: string, entityType: string, entityId: string, details?: object) {
  prisma.auditLogEntry.create({ data: { adminId, action, entityType, entityId, details } }).catch((err) => {
    console.error("[admin] audit log write failed:", err);
  });
}

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

/** GET /api/admin/programs — every training programme, including inactive
 *  ones, for the admin Training Programs manager. */
adminRouter.get("/programs", async (_req, res) => {
  const programs = await prisma.trainingProgram.findMany({
    include: { nsqfQualification: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(programs);
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
  logAdmin(req.auth!.userId, "program.create", "TrainingProgram", created.id);
  res.status(201).json(created);
});

/** PATCH /api/admin/programs/:id */
adminRouter.patch("/programs/:id", async (req, res) => {
  try {
    const updated = await prisma.trainingProgram.update({
      where: { id: req.params.id },
      data: req.body,
    });
    logAdmin(req.auth!.userId, "program.update", "TrainingProgram", updated.id, req.body);
    res.json(updated);
  } catch {
    res.status(404).json({ error: "Not found" });
  }
});

/** DELETE /api/admin/programs/:id */
adminRouter.delete("/programs/:id", async (req, res) => {
  try {
    await prisma.trainingProgram.delete({ where: { id: req.params.id } });
    logAdmin(req.auth!.userId, "program.delete", "TrainingProgram", req.params.id);
    res.status(204).end();
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
  logAdmin(req.auth!.userId, "job_posting.create", "JobPosting", created.id);
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
    logAdmin(req.auth!.userId, "job_posting.update", "JobPosting", updated.id, parsed.data);
    res.json(updated);
  } catch {
    res.status(404).json({ error: "Not found" });
  }
});

/** DELETE /api/admin/job-postings/:id */
adminRouter.delete("/job-postings/:id", async (req, res) => {
  try {
    await prisma.jobPosting.delete({ where: { id: req.params.id } });
    logAdmin(req.auth!.userId, "job_posting.delete", "JobPosting", req.params.id);
    res.status(204).end();
  } catch {
    res.status(404).json({ error: "Not found" });
  }
});

/** PATCH /api/admin/nsqf/:id — edit a small, admin-safe subset of a scraped
 *  NSQF qualification (keywords the voice pipeline matches on, and whether
 *  it's excluded as expired). Everything else is scraped/traceable data and
 *  stays read-only from here — see scripts/scrape-nsqf-details.ts. */
const nsqfEditSchema = z.object({
  keywords: z.array(z.string()).optional(),
  expired: z.boolean().optional(),
  description: z.string().optional(),
});
adminRouter.patch("/nsqf/:id", async (req, res) => {
  const parsed = nsqfEditSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  try {
    const updated = await prisma.nsqfQualification.update({ where: { id: req.params.id }, data: parsed.data });
    logAdmin(req.auth!.userId, "nsqf.update", "NsqfQualification", updated.id, parsed.data);
    res.json(updated);
  } catch {
    res.status(404).json({ error: "Not found" });
  }
});

const knowledgeSchema = z.object({
  documentTitle: z.string().min(2),
  sourceUrl: z.string().min(2),
  page: z.number().int().default(1),
  chunkIndex: z.number().int().default(0),
  text: z.string().min(1),
});

/** GET /api/admin/knowledge — every RAG chunk backing /api/assistant/ask */
adminRouter.get("/knowledge", async (_req, res) => {
  res.json(await prisma.knowledgeChunk.findMany({ orderBy: [{ documentTitle: "asc" }, { page: "asc" }, { chunkIndex: "asc" }] }));
});

/** POST /api/admin/knowledge — add a new policy-document passage */
adminRouter.post("/knowledge", async (req, res) => {
  const parsed = knowledgeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const created = await prisma.knowledgeChunk.create({ data: parsed.data });
  logAdmin(req.auth!.userId, "knowledge.create", "KnowledgeChunk", created.id);
  res.status(201).json(created);
});

/** PATCH /api/admin/knowledge/:id */
adminRouter.patch("/knowledge/:id", async (req, res) => {
  const parsed = knowledgeSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  try {
    const updated = await prisma.knowledgeChunk.update({ where: { id: req.params.id }, data: parsed.data });
    logAdmin(req.auth!.userId, "knowledge.update", "KnowledgeChunk", updated.id);
    res.json(updated);
  } catch {
    res.status(404).json({ error: "Not found" });
  }
});

/** DELETE /api/admin/knowledge/:id */
adminRouter.delete("/knowledge/:id", async (req, res) => {
  try {
    await prisma.knowledgeChunk.delete({ where: { id: req.params.id } });
    logAdmin(req.auth!.userId, "knowledge.delete", "KnowledgeChunk", req.params.id);
    res.status(204).end();
  } catch {
    res.status(404).json({ error: "Not found" });
  }
});

/** PATCH /api/admin/recommendations/:id — manually correct a beneficiary's
 *  funnel status, e.g. confirming ENROLLED after a phone follow-up. */
adminRouter.patch("/recommendations/:id", async (req, res) => {
  const parsed = z
    .object({ status: z.enum(["SUGGESTED", "VIEWED", "INTERESTED", "APPLIED", "ENROLLED", "REJECTED"]) })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  try {
    const updated = await prisma.recommendation.update({ where: { id: req.params.id }, data: parsed.data });
    logAdmin(req.auth!.userId, "recommendation.update_status", "Recommendation", updated.id, parsed.data);
    res.json(updated);
  } catch {
    res.status(404).json({ error: "Not found" });
  }
});

/** PATCH /api/admin/users/:id/moderation — suspend/unsuspend a beneficiary
 *  and/or set an admin-only note. Does not touch or delete their data. */
adminRouter.patch("/users/:id/moderation", async (req, res) => {
  const parsed = z.object({ suspended: z.boolean().optional(), adminNote: z.string().optional() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  try {
    const updated = await prisma.user.update({ where: { id: req.params.id }, data: parsed.data });
    logAdmin(req.auth!.userId, "user.moderate", "User", updated.id, parsed.data);
    res.json({ id: updated.id, suspended: updated.suspended, adminNote: updated.adminNote });
  } catch {
    res.status(404).json({ error: "Not found" });
  }
});

/** GET /api/admin/consent — counts for the consent/privacy dashboard:
 *  beneficiaries who granted location consent, and pending deletion requests. */
adminRouter.get("/consent", async (_req, res) => {
  const [totalBeneficiaries, locationConsented, deletionRequests] = await Promise.all([
    prisma.user.count({ where: { role: "BENEFICIARY" } }),
    prisma.user.count({ where: { role: "BENEFICIARY", locationConsent: true } }),
    prisma.user.findMany({
      where: { deletionRequestedAt: { not: null } },
      select: { id: true, name: true, phone: true, deletionRequestedAt: true },
      orderBy: { deletionRequestedAt: "asc" },
    }),
  ]);
  res.json({ totalBeneficiaries, locationConsented, deletionRequests });
});

/** GET /api/admin/admins — every ADMIN or VIEWER account, for the admin-user manager */
adminRouter.get("/admins", async (_req, res) => {
  const admins = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "VIEWER"] } },
    select: { id: true, name: true, phone: true, role: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  res.json(admins);
});

/** POST /api/admin/admins — create a new admin or read-only viewer account */
adminRouter.post("/admins", async (req, res) => {
  const parsed = z
    .object({
      phone: z.string().min(6).max(15),
      name: z.string().min(1),
      password: z.string().min(8),
      role: z.enum(["ADMIN", "VIEWER"]).default("ADMIN"),
    })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const existing = await prisma.user.findUnique({ where: { phone: parsed.data.phone } });
  if (existing) return res.status(409).json({ error: "Phone already registered" });
  const bcrypt = await import("bcryptjs");
  const created = await prisma.user.create({
    data: {
      phone: parsed.data.phone,
      name: parsed.data.name,
      role: parsed.data.role,
      passwordHash: await bcrypt.hash(parsed.data.password, 10),
    },
  });
  logAdmin(req.auth!.userId, "admin.create", "User", created.id, { role: parsed.data.role });
  res.status(201).json({ id: created.id, name: created.name, phone: created.phone, role: created.role });
});

/** GET /api/admin/audit-log?take=&entityType= — recent admin actions */
adminRouter.get("/audit-log", async (req, res) => {
  const take = Math.min(Number(req.query.take ?? 100), 500);
  const where = req.query.entityType ? { entityType: String(req.query.entityType) } : {};
  const entries = await prisma.auditLogEntry.findMany({
    where,
    include: { admin: { select: { id: true, name: true, phone: true } } },
    orderBy: { createdAt: "desc" },
    take,
  });
  res.json(entries);
});

/** GET /api/admin/otp-activity — recent OTP requests, for abuse monitoring.
 *  codeHash is never returned. */
adminRouter.get("/otp-activity", async (_req, res) => {
  const rows = await prisma.otpCode.findMany({
    select: { phone: true, attempts: true, expiresAt: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  res.json(rows);
});

/** GET /api/admin/leaderboard — district conversion rates (SUGGESTED -> ENROLLED),
 *  and language coverage, for the analytics dashboard. */
adminRouter.get("/leaderboard", async (_req, res) => {
  const sessions = await prisma.voiceSession.findMany({
    where: { district: { not: null } },
    select: { district: true, recommendations: { select: { status: true } } },
  });
  const byDistrict = new Map<string, { suggested: number; enrolled: number }>();
  for (const s of sessions) {
    if (!s.district) continue;
    const row = byDistrict.get(s.district) ?? { suggested: 0, enrolled: 0 };
    row.suggested += s.recommendations.length;
    row.enrolled += s.recommendations.filter((r) => r.status === "ENROLLED").length;
    byDistrict.set(s.district, row);
  }
  const districts = [...byDistrict.entries()]
    .map(([district, r]) => ({
      district,
      ...r,
      conversionRate: r.suggested ? Number((r.enrolled / r.suggested).toFixed(3)) : 0,
    }))
    .sort((a, b) => b.conversionRate - a.conversionRate);

  const languageCounts = await prisma.voiceSession.groupBy({ by: ["language"], _count: true });

  res.json({ districts, languageCounts });
});

/** GET /api/admin/coverage-gaps — sectors with active job postings but no
 *  linked NSQF qualification, and qualifications with no postings at all —
 *  a gap-analysis view for the Ministry dashboard. */
adminRouter.get("/coverage-gaps", async (_req, res) => {
  const [postingsWithoutQualification, sectorsWithQualificationsOnly] = await Promise.all([
    prisma.jobPosting.findMany({
      where: { active: true, nsqfQualificationId: null },
      select: { id: true, title: true, sector: true, employerName: true },
    }),
    prisma.nsqfQualification.groupBy({
      by: ["sector"],
      where: { expired: false, jobPostings: { none: {} } },
      _count: true,
    }),
  ]);
  res.json({
    postingsWithoutQualification,
    sectorsWithNoPostings: sectorsWithQualificationsOnly
      .map((s) => ({ sector: s.sector, qualificationCount: s._count }))
      .sort((a, b) => b.qualificationCount - a.qualificationCount),
  });
});

/** GET /api/admin/needs-review — SkillMappings the pipeline could not match
 *  to a real NSQF qualification, for manual review/correction. */
adminRouter.get("/needs-review", async (_req, res) => {
  const rows = await prisma.skillMapping.findMany({
    where: { nsqfQualificationId: null, normalizedSkill: { not: "unknown" } },
    include: { session: { select: { id: true, createdAt: true, language: true, rawTranscript: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  res.json(rows);
});

/** GET /api/admin/sessions/:id — one session with everything the list view
 *  summarizes, for a per-session detail page. */
adminRouter.get("/sessions/:id", async (req, res) => {
  const session = await prisma.voiceSession.findUnique({
    where: { id: req.params.id },
    include: {
      user: { select: { id: true, name: true, phone: true, district: true, state: true } },
      mappings: { include: { nsqfQualification: true } },
      recommendations: { include: { pmajayCourse: true, trainingProgram: true } },
    },
  });
  if (!session) return res.status(404).json({ error: "Not found" });
  res.json(session);
});

/** GET /api/admin/config-status — which optional providers are actually
 *  configured (booleans only — never the secret values themselves), so an
 *  admin can see setup gaps without reading Render's environment directly. */
adminRouter.get("/config-status", async (_req, res) => {
  const { hasLLM, hasSarvam, hasGroq, hasBhashini, hasSms, hasTwilio, hasStitch, useDemoOtp } = await import(
    "../lib/env.js"
  );
  res.json({
    llm: hasLLM,
    sarvamSpeech: hasSarvam,
    groq: hasGroq,
    bhashini: hasBhashini,
    sms: hasSms,
    twilioWhatsapp: hasTwilio,
    stitch: hasStitch,
    otpMode: useDemoOtp ? "demo (fixed code)" : "real (random code via SMS)",
  });
});
