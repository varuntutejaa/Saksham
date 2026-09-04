import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { signToken, authenticate } from "../middleware/auth.js";

export const authRouter = Router();

const registerSchema = z.object({
  phone: z.string().min(6).max(15),
  name: z.string().min(1).optional(),
  password: z.string().min(4),
  language: z
    .enum(["hi", "en", "bn", "ta", "te", "mr", "kn", "gu", "pa", "or"])
    .optional(),
  role: z.enum(["BENEFICIARY", "ADMIN"]).optional(),
  state: z.string().optional(),
  district: z.string().optional(),
});

authRouter.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { password, ...rest } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { phone: rest.phone } });
  if (existing) return res.status(409).json({ error: "Phone already registered" });

  const user = await prisma.user.create({
    data: { ...rest, passwordHash: await bcrypt.hash(password, 10) },
  });
  const token = signToken({ userId: user.id, role: user.role });
  res.status(201).json({ token, user: safeUser(user) });
});

const loginSchema = z.object({
  phone: z.string(),
  password: z.string(),
});

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const user = await prisma.user.findUnique({ where: { phone: parsed.data.phone } });
  if (!user?.passwordHash || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  const token = signToken({ userId: user.id, role: user.role });
  res.json({ token, user: safeUser(user) });
});

authRouter.get("/me", authenticate, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.auth!.userId } });
  if (!user) return res.status(404).json({ error: "Not found" });
  res.json({ user: safeUser(user) });
});

function safeUser<T extends { passwordHash: string | null }>(user: T) {
  const { passwordHash, ...rest } = user;
  return rest;
}
