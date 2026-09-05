import { Router, type Response } from "express";
import { z } from "zod";
import { authenticate, requireRole } from "../middleware/auth.js";
import {
  createStitchProject,
  formatStitchError,
  generateStitchScreen,
  getStitchScreen,
  getStitchStatus,
  listStitchProjects,
  listStitchScreens,
} from "../services/stitch.js";

export const stitchRouter = Router();

const deviceTypeSchema = z.enum(["MOBILE", "DESKTOP", "TABLET", "AGNOSTIC"]);
const modelIdSchema = z.enum(["GEMINI_3_PRO", "GEMINI_3_FLASH", "GEMINI_3_1_PRO"]);

function sendStitchError(res: Response, error: unknown) {
  const formatted = formatStitchError(error);
  res.status(formatted.status).json({ error: formatted.message, code: formatted.code });
}

stitchRouter.get("/status", (_req, res) => {
  res.json(getStitchStatus());
});

stitchRouter.use(authenticate, requireRole("ADMIN"));

stitchRouter.get("/projects", async (_req, res) => {
  try {
    res.json(await listStitchProjects());
  } catch (error) {
    sendStitchError(res, error);
  }
});

stitchRouter.post("/projects", async (req, res) => {
  const parsed = z.object({ title: z.string().min(1).max(120).optional() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    res.status(201).json(await createStitchProject(parsed.data.title));
  } catch (error) {
    sendStitchError(res, error);
  }
});

stitchRouter.get("/projects/:projectId/screens", async (req, res) => {
  const parsed = z
    .object({ includeAssets: z.coerce.boolean().default(false) })
    .safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    res.json(await listStitchScreens(req.params.projectId, parsed.data.includeAssets));
  } catch (error) {
    sendStitchError(res, error);
  }
});

stitchRouter.get("/projects/:projectId/screens/:screenId", async (req, res) => {
  const parsed = z
    .object({ includeAssets: z.coerce.boolean().default(true) })
    .safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    res.json(await getStitchScreen(req.params.projectId, req.params.screenId, parsed.data.includeAssets));
  } catch (error) {
    sendStitchError(res, error);
  }
});

stitchRouter.post("/screens", async (req, res) => {
  const parsed = z
    .object({
      prompt: z.string().min(8).max(4000),
      projectId: z.string().min(1).optional(),
      projectTitle: z.string().min(1).max(120).optional(),
      deviceType: deviceTypeSchema.default("MOBILE"),
      modelId: modelIdSchema.optional(),
      includeAssets: z.boolean().default(true),
    })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    res.status(201).json(await generateStitchScreen(parsed.data));
  } catch (error) {
    sendStitchError(res, error);
  }
});
