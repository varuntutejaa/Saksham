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

function normalizeLocation(value: string | null | undefined): string | null {
  return value?.trim().toLowerCase().replace(/[^a-z0-9]+/g, "") || null;
}

/** "State [ODISHA]" -> "odisha"; national rows return null. */
function courseStateName(courseLevel: string): string | null {
  const match = courseLevel.match(/\[([^\]]+)\]/);
  return match ? match[1].trim() : null;
}

function pmajayCourseLocationRank(courseLevel: string, preferredState?: string): number {
  const scopedState = normalizeLocation(courseStateName(courseLevel));
  const userState = normalizeLocation(preferredState);
  if (scopedState && userState && userState.includes(scopedState)) return 2;
  if (!scopedState) return 1;
  return 0;
}

function programLocationRank(
  program: { state: string | null; district: string | null },
  preferredState?: string,
  preferredDistrict?: string,
): number {
  const userDistrict = normalizeLocation(preferredDistrict);
  const userState = normalizeLocation(preferredState);
  const programDistrict = normalizeLocation(program.district);
  const programState = normalizeLocation(program.state);
  if (programDistrict && userDistrict && (programDistrict.includes(userDistrict) || userDistrict.includes(programDistrict))) {
    return 3;
  }
  if (programState && userState && (programState.includes(userState) || userState.includes(programState))) {
    return 2;
  }
  if (!programState && !programDistrict) return 1;
  return 0;
}

/** GET /api/nsqf — NSQF qualifications (?sector= &level= &q= &page= &pageSize=) */
catalogRouter.get("/nsqf", async (req, res) => {
  const parsed = pageQuery.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { page, pageSize } = parsed.data;
  const { sector, q, includeExpired } = req.query as Record<string, string | undefined>;
  const level = req.query.level ? Number(req.query.level) : undefined;

  const where = {
    // NQR qualifications expire; the catalogue hides those unless asked
    ...(includeExpired === "true" ? {} : { expired: false }),
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
    where: { expired: false },
    select: { sector: true, nsqfLevel: true },
    distinct: ["sector"],
    orderBy: { sector: "asc" },
  });
  const levels = await prisma.nsqfQualification.findMany({
    where: { expired: false },
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
 *  (?sector= &courseLevel= &q= &preferredState= &page= &pageSize=) */
catalogRouter.get("/pmajay-courses", async (req, res) => {
  const parsed = pageQuery.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { page, pageSize } = parsed.data;
  const { sector, courseLevel, q, preferredState } = req.query as Record<string, string | undefined>;

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
  const shouldRankByLocation = Boolean(preferredState) && !courseLevel;
  const [items, total] = await Promise.all([
    prisma.pmajayCourse.findMany({
      where,
      orderBy: [{ sector: "asc" }, { subCourseName: "asc" }],
      ...(shouldRankByLocation ? {} : { skip: (page - 1) * pageSize, take: pageSize }),
    }),
    prisma.pmajayCourse.count({ where }),
  ]);
  const pageItems = shouldRankByLocation
    ? items
        .sort(
          (a, b) =>
            pmajayCourseLocationRank(b.courseLevel, preferredState) -
              pmajayCourseLocationRank(a.courseLevel, preferredState) ||
            a.sector.localeCompare(b.sector) ||
            a.subCourseName.localeCompare(b.subCourseName),
        )
        .slice((page - 1) * pageSize, page * pageSize)
    : items;
  res.json(paginate(pageItems, total, page, pageSize));
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

/** GET /api/programs — training programmes
 *  (?state= &district= &sector= &preferredState= &preferredDistrict= &page= &pageSize=) */
catalogRouter.get("/programs", async (req, res) => {
  const parsed = pageQuery.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { page, pageSize } = parsed.data;
  const { state, district, sector, q, preferredState, preferredDistrict } = req.query as Record<string, string | undefined>;

  const where = {
    active: true,
    ...(state ? { state } : {}),
    ...(district ? { district } : {}),
    ...(sector ? { sector } : {}),
    ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}),
  };
  const shouldRankByLocation = Boolean(preferredState || preferredDistrict) && !state && !district;
  const [items, total] = await Promise.all([
    prisma.trainingProgram.findMany({
      where,
      include: { nsqfQualification: true },
      orderBy: { createdAt: "desc" },
      ...(shouldRankByLocation ? {} : { skip: (page - 1) * pageSize, take: pageSize }),
    }),
    prisma.trainingProgram.count({ where }),
  ]);
  const pageItems = shouldRankByLocation
    ? items
        .sort(
          (a, b) =>
            programLocationRank(b, preferredState, preferredDistrict) -
              programLocationRank(a, preferredState, preferredDistrict) ||
            b.createdAt.getTime() - a.createdAt.getTime(),
        )
        .slice((page - 1) * pageSize, page * pageSize)
    : items;
  res.json(paginate(pageItems, total, page, pageSize));
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

/** GET /api/job-postings — active vacancies (?sector= &state= &q= &page= &pageSize=).
 *  Same JobPosting rows services/jobs.ts matches against a beneficiary's
 *  spoken skills for the conversational assistant; this is the plain
 *  browsable listing for the app/website. `source` (SAMPLE | EMPLOYER | NCS)
 *  is always included — SAMPLE rows must be labeled as demonstration data,
 *  never presented as a live opening. */
catalogRouter.get("/job-postings", async (req, res) => {
  const parsed = pageQuery.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { page, pageSize } = parsed.data;
  const { sector, state, q } = req.query as Record<string, string | undefined>;

  const where = {
    active: true,
    ...(sector ? { sector } : {}),
    ...(state ? { state } : {}),
    ...(q ? { title: { contains: q, mode: "insensitive" as const } } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.jobPosting.findMany({
      where,
      include: { nsqfQualification: true },
      orderBy: { postedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.jobPosting.count({ where }),
  ]);
  res.json(paginate(items, total, page, pageSize));
});

/** GET /api/job-postings/:id */
catalogRouter.get("/job-postings/:id", async (req, res) => {
  const item = await prisma.jobPosting.findUnique({
    where: { id: req.params.id },
    include: { nsqfQualification: true },
  });
  if (!item) return res.status(404).json({ error: "Not found" });
  res.json(item);
});
