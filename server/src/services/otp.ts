import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";
import { hasSms } from "../lib/env.js";

/**
 * One-time codes for signup phone verification and password reset.
 *
 * Codes are stored in Postgres (model OtpCode), not in memory: Render's free
 * tier spins the service down when idle, and an in-memory store lost every
 * pending code on restart — a beneficiary could request a code, the service
 * would sleep, and the code would be gone. The table also keeps the flow
 * working if the API ever runs on more than one instance.
 *
 * The code is stored as a bcrypt hash, so a leaked database row does not hand
 * an attacker a working code. Brute force is bounded by MAX_ATTEMPTS and the
 * 10-minute expiry.
 *
 * No SMS provider is wired up yet (no SMS_API_KEY), so — same pattern as
 * services/speech.ts — this falls back to "mock" mode: the code is generated
 * and stored, and the response also carries `devOtp` so the flow is testable
 * without a real handset. Implement deliverOtp and set SMS_API_KEY to send
 * real messages; `devOtp` is then omitted.
 */

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 5;

/** 4 digits: materially easier to hear, remember and type for a beneficiary
 *  reading an SMS aloud or using a feature phone. Brute force stays bounded by
 *  MAX_ATTEMPTS and the TTL above. */
function generateCode(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export interface RequestOtpResult {
  provider: "mock" | "sms";
  /** only present in mock mode, so the flow is testable without real SMS */
  devOtp?: string;
}

export async function requestOtp(phone: string): Promise<RequestOtpResult> {
  const code = generateCode();
  const record = {
    codeHash: await bcrypt.hash(code, 10),
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
    attempts: 0,
  };
  // one pending code per phone — requesting again replaces the previous one
  await prisma.otpCode.upsert({
    where: { phone },
    update: record,
    create: { phone, ...record },
  });

  if (hasSms) {
    // await deliverOtp(phone, code) — wire a real SMS provider here.
    return { provider: "sms" };
  }
  console.log(`[otp:mock] OTP for ${phone}: ${code} (no SMS_API_KEY set)`);
  return { provider: "mock", devOtp: code };
}

export type VerifyOtpResult = "ok" | "not_found" | "expired" | "too_many_attempts" | "mismatch";

export async function verifyOtp(phone: string, code: string): Promise<VerifyOtpResult> {
  const rec = await prisma.otpCode.findUnique({ where: { phone } });
  if (!rec) return "not_found";

  if (Date.now() > rec.expiresAt.getTime()) {
    await prisma.otpCode.delete({ where: { phone } }).catch(() => {});
    return "expired";
  }
  if (rec.attempts >= MAX_ATTEMPTS) {
    await prisma.otpCode.delete({ where: { phone } }).catch(() => {});
    return "too_many_attempts";
  }
  if (!(await bcrypt.compare(code, rec.codeHash))) {
    await prisma.otpCode.update({ where: { phone }, data: { attempts: { increment: 1 } } });
    return "mismatch";
  }

  // single use: consume the code so it cannot be replayed
  await prisma.otpCode.delete({ where: { phone } }).catch(() => {});
  return "ok";
}

/** Housekeeping: drop codes that expired long ago. Safe to call on a timer;
 *  verification already rejects expired rows, so this is only tidying. */
export async function purgeExpiredOtps(): Promise<number> {
  const { count } = await prisma.otpCode.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  return count;
}
