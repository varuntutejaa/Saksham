import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { mapTranscriptToNsqf } from "../services/nsqf.js";

export const catalogRouter = Router();

/** GET /api/nsqf — list NSQF qualifications (filter by ?sector= &level=) */
catalogRouter.get("/nsqf", async (req, res) => {
  const sector = req.query.sector as string | undefined;
  const level = req.query.level ? Number(req.query.level) : undefined;
  const items = await prisma.nsqfQualification.findMany({
    where: {
      ...(sector ? { sector } : {}),
      ...(level ? { nsqfLevel: level } : {}),
    },
    orderBy: [{ sector: "asc" }, { nsqfLevel: "asc" }],
  });
  res.json(items);
});

/** POST /api/nsqf/map — { text } -> NSQF mapping only (no persistence) */
catalogRouter.post("/nsqf/map", async (req, res) => {
  const parsed = z.object({ text: z.string().min(2) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  res.json(await mapTranscriptToNsqf(parsed.data.text));
});

/** GET /api/programs — list training programmes (filter by ?state= &district= &sector=) */
catalogRouter.get("/programs", async (req, res) => {
  const { state, district, sector } = req.query as Record<string, string | undefined>;
  const items = await prisma.trainingProgram.findMany({
    where: {
      active: true,
      ...(state ? { state } : {}),
      ...(district ? { district } : {}),
      ...(sector ? { sector } : {}),
    },
    include: { nsqfQualification: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(items);
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
