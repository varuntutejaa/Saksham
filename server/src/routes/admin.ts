import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate, requireRole } from "../middleware/auth.js";

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
