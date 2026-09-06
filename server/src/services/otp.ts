import { hasSms } from "../lib/env.js";

/**
 * Phone-based password reset OTP.
 *
 * There's no SMS provider wired up yet (no SMS_API_KEY set anywhere in this
 * project), so — same pattern as services/speech.ts — this falls back to a
 * "mock" mode: the OTP is generated and stored, but the response ALSO carries
 * `devOtp` so the flow is fully testable without a real phone. A real
 * provider (set SMS_API_KEY) would drop `devOtp` from the response and
 * actually send the SMS in `deliverOtp`.
 *
 * Storage is in-memory (Map), which is fine for a single dev/demo server but
 * does NOT survive a restart or work across multiple server instances — if
 * this goes to real production, back this with a DB table instead.
 */

interface OtpRecord {
  code: string;
  expiresAt: number;
  attempts: number;
}

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 5;

const store = new Map<string, OtpRecord>();

/** 4 digits: shorter is materially easier to hear, remember and type for a
 *  beneficiary reading an SMS aloud or entering it on a feature phone. The
 *  brute-force risk is bounded by MAX_ATTEMPTS and the 10-minute TTL. */
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
  store.set(phone, { code, expiresAt: Date.now() + OTP_TTL_MS, attempts: 0 });

  if (hasSms) {
    // await deliverOtp(phone, code) — wire a real SMS provider here.
    return { provider: "sms" };
  }
  console.log(`[otp:mock] OTP for ${phone}: ${code} (no SMS_API_KEY set)`);
  return { provider: "mock", devOtp: code };
}

export type VerifyOtpResult = "ok" | "not_found" | "expired" | "too_many_attempts" | "mismatch";

export function verifyOtp(phone: string, code: string): VerifyOtpResult {
  const rec = store.get(phone);
  if (!rec) return "not_found";
  if (Date.now() > rec.expiresAt) {
    store.delete(phone);
    return "expired";
  }
  if (rec.attempts >= MAX_ATTEMPTS) {
    store.delete(phone);
    return "too_many_attempts";
  }
  if (rec.code !== code) {
    rec.attempts += 1;
    return "mismatch";
  }
  store.delete(phone);
  return "ok";
}
