import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { signToken, authenticate } from "../middleware/auth.js";
import { requestOtp, verifyOtp, type VerifyOtpResult } from "../services/otp.js";

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

const profileSchema = z.object({
  gender: z.enum(["male", "female", "other"]).optional(),
  age: z.number().int().min(10).max(100).optional(),
  education: z
    .enum(["below_10th", "10th", "12th", "iti_diploma", "undergrad", "postgrad"])
    .optional(),
  onboarded: z.boolean().optional(),
  avatarUrl: z.string().max(1_500_000).nullable().optional(),
});

/** PATCH /api/auth/profile — fill in the post-signup gender/age/education questions. */
authRouter.patch("/profile", authenticate, async (req, res) => {
  const parsed = profileSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const user = await prisma.user.update({
    where: { id: req.auth!.userId },
    data: parsed.data,
  });
  res.json({ user: safeUser(user) });
});

const forgotPasswordSchema = z.object({ phone: z.string().min(6).max(15) });

/**
 * POST /api/auth/forgot-password — request an OTP to reset your password.
 * No SMS provider is configured (see services/otp.ts), so the response
 * carries `devOtp` in mock mode — the app shows it inline so the flow is
 * fully testable without real SMS.
 */
authRouter.post("/forgot-password", async (req, res) => {
  const parsed = forgotPasswordSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const user = await prisma.user.findUnique({ where: { phone: parsed.data.phone } });
  if (!user) return res.status(404).json({ error: "No account found with this phone number" });

  const result = await requestOtp(parsed.data.phone);
  res.json({ sent: true, ...result });
});

const resetPasswordSchema = z.object({
  phone: z.string().min(6).max(15),
  otp: z.string().length(6),
  newPassword: z.string().min(4),
});

/** POST /api/auth/reset-password — verify the OTP and set a new password. */
authRouter.post("/reset-password", async (req, res) => {
  const parsed = resetPasswordSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { phone, otp, newPassword } = parsed.data;

  const result = verifyOtp(phone, otp);
  if (result !== "ok") {
    const messages: Record<VerifyOtpResult, string> = {
      not_found: "Please request a new code",
      expired: "This code has expired, please request a new one",
      too_many_attempts: "Too many incorrect attempts, please request a new code",
      mismatch: "Incorrect code",
      ok: "",
    };
    return res.status(400).json({ error: messages[result] });
  }

  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user) return res.status(404).json({ error: "No account found with this phone number" });

  const updated = await prisma.user.update({
    where: { phone },
    data: { passwordHash: await bcrypt.hash(newPassword, 10) },
  });
  const token = signToken({ userId: updated.id, role: updated.role });
  res.json({ token, user: safeUser(updated) });
});

function safeUser<T extends { passwordHash: string | null }>(user: T) {
  const { passwordHash, ...rest } = user;
  return rest;
}
