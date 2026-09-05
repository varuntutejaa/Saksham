import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { mapTranscriptToNsqf } from "../services/nsqf.js";

export const catalogRouter = Router();

/** Every list endpoint here is paginated the same way: `?page=1&pageSize=5`
 *  in, `{ items, total, page, pageSize, totalPages }` out. The catalogues are
 *  large (1,283 NSQF QPs, 2,366 PM-AJAY courses) — the app can't hold them. */
const pageQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(5),
});

function paginate<T>(items: T[], total: number, page: number, pageSize: number) {
  return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

/** GET /api/nsqf — NSQF qualifications (?sector= &level= &q= &page= &pageSize=) */
catalogRouter.get("/nsqf", async (req, res) => {
  const parsed = pageQuery.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { page, pageSize } = parsed.data;
  const { sector, q } = req.query as Record<string, string | undefined>;
  const level = req.query.level ? Number(req.query.level) : undefined;

  const where = {
    ...(sector ? { sector } : {}),
    ...(level ? { nsqfLevel: level } : {}),
    ...(q ? { title: { contains: q, mode: "insensitive" as const } } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.nsqfQualification.findMany({
      where,
      orderBy: [{ sector: "asc" }, { nsqfLevel: "asc" }, { title: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.nsqfQualification.count({ where }),
  ]);
  res.json(paginate(items, total, page, pageSize));
});

/** GET /api/nsqf/filters — the sector + level values that actually exist */
catalogRouter.get("/nsqf/filters", async (_req, res) => {
  const rows = await prisma.nsqfQualification.findMany({
    select: { sector: true, nsqfLevel: true },
    distinct: ["sector"],
    orderBy: { sector: "asc" },
  });
  const levels = await prisma.nsqfQualification.findMany({
    select: { nsqfLevel: true },
    distinct: ["nsqfLevel"],
    orderBy: { nsqfLevel: "asc" },
  });
  res.json({ sectors: rows.map((r) => r.sector), levels: levels.map((l) => l.nsqfLevel) });
});

/** POST /api/nsqf/map — { text } -> NSQF mapping only (no persistence) */
catalogRouter.post("/nsqf/map", async (req, res) => {
  const parsed = z.object({ text: z.string().min(2) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  res.json(await mapTranscriptToNsqf(parsed.data.text));
});

/** GET /api/pmajay-courses — the real PM-AJAY course catalogue
 *  (?sector= &courseLevel= &q= &page= &pageSize=) */
catalogRouter.get("/pmajay-courses", async (req, res) => {
  const parsed = pageQuery.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { page, pageSize } = parsed.data;
  const { sector, courseLevel, q } = req.query as Record<string, string | undefined>;

  const where = {
    ...(sector ? { sector } : {}),
    ...(courseLevel ? { courseLevel } : {}),
    ...(q
      ? {
          OR: [
            { subCourseName: { contains: q, mode: "insensitive" as const } },
            { courseName: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
  const [items, total] = await Promise.all([
    prisma.pmajayCourse.findMany({
      where,
      orderBy: [{ sector: "asc" }, { subCourseName: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.pmajayCourse.count({ where }),
  ]);
  res.json(paginate(items, total, page, pageSize));
});

/** GET /api/pmajay-courses/filters — sector + course-level values that exist */
catalogRouter.get("/pmajay-courses/filters", async (_req, res) => {
  const [sectors, levels] = await Promise.all([
    prisma.pmajayCourse.findMany({ select: { sector: true }, distinct: ["sector"], orderBy: { sector: "asc" } }),
    prisma.pmajayCourse.findMany({
      select: { courseLevel: true },
      distinct: ["courseLevel"],
      orderBy: { courseLevel: "asc" },
    }),
  ]);
  res.json({ sectors: sectors.map((s) => s.sector), courseLevels: levels.map((l) => l.courseLevel) });
});

/** GET /api/programs — training programmes (?state= &district= &sector= &page= &pageSize=) */
catalogRouter.get("/programs", async (req, res) => {
  const parsed = pageQuery.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { page, pageSize } = parsed.data;
  const { state, district, sector, q } = req.query as Record<string, string | undefined>;

  const where = {
    active: true,
    ...(state ? { state } : {}),
    ...(district ? { district } : {}),
    ...(sector ? { sector } : {}),
    ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.trainingProgram.findMany({
      where,
      include: { nsqfQualification: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.trainingProgram.count({ where }),
  ]);
  res.json(paginate(items, total, page, pageSize));
});

/** GET /api/programs/filters — sector values that exist on active programmes */
catalogRouter.get("/programs/filters", async (_req, res) => {
  const rows = await prisma.trainingProgram.findMany({
    where: { active: true },
    select: { sector: true },
    distinct: ["sector"],
    orderBy: { sector: "asc" },
  });
  res.json({ sectors: rows.map((r) => r.sector).filter((s): s is string => Boolean(s)) });
});

/** GET /api/programs/:id */
catalogRouter.get("/programs/:id", async (req, res) => {
  const item = await prisma.trainingProgram.findUnique({
    where: { id: req.params.id },
    include: { nsqfQualification: true },
  });
  if (!item) return res.status(404).json({ error: "Not found" });
  res.json(item);
});
