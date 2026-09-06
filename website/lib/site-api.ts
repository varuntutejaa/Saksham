import type { LanguageCode } from "./languages";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ??
  "https://saksham-api-82mn.onrender.com";

/** Thrown when the backend rejects a beneficiary token as invalid/expired —
 *  callers should clear the stored session rather than leaving a dead
 *  token around. */
export class UnauthorizedError extends Error {
  constructor() {
    super("Session expired");
    this.name = "UnauthorizedError";
  }
}

export interface NsqfMapping {
  rawSkillText: string;
  normalizedSkill: string;
  nsqfQualificationId: string | null;
  qpCode: string | null;
  title: string | null;
  sector: string | null;
  nsqfLevel: number | null;
  confidence: number;
  method: string;
  pmajayVerified: boolean;
  pmajayCourse: { subCourseCode: string; subCourseName: string; sector: string } | null;
}

export interface ProgramRecommendation {
  recommendationId?: string;
  trainingProgramId: string;
  name: string;
  nameHindi: string | null;
  scheme: string;
  component: string | null;
  sector: string | null;
  nsqfLevel: number | null;
  mode: string;
  durationWeeks: number | null;
  stipend: boolean;
  district: string | null;
  state: string | null;
  contactPhone: string | null;
  seatsAvailable: number | null;
  score: number;
  rationale: string;
}

export interface Program {
  id: string;
  name: string;
  nameHindi: string | null;
  scheme: string;
  component: string | null;
  sector: string | null;
  nsqfLevel: number | null;
  mode: string;
  durationWeeks: number | null;
  stipend: boolean;
  state: string | null;
  district: string | null;
  seatsAvailable: number | null;
  contactPhone: string | null;
  eligibilityNote: string | null;
}

export async function getPrograms(params: { state?: string; district?: string } = {}): Promise<Program[]> {
  const qs = new URLSearchParams(
    Object.entries(params).filter((e): e is [string, string] => Boolean(e[1])),
  );
  const res = await fetch(`${API_BASE}/api/programs${qs.toString() ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`programs ${res.status}`);
  const data = await res.json();
  // the API returns a bare array in some deployments and a paginated
  // { items, total, ... } envelope in others — accept either.
  return Array.isArray(data) ? data : (data?.items ?? []);
}

export interface ConverseResponse {
  sessionId: string;
  transcript: string;
  language?: LanguageCode;
  stt?: { provider: string; confidence: number; language?: LanguageCode };
  mappings: NsqfMapping[];
  recommendations: ProgramRecommendation[];
  reply: { text: string; audioUrl: string; format: string };
}

export interface ConversationMessage {
  role: "user" | "assistant";
  text: string;
}

interface ConverseInput {
  transcript: string;
  language: LanguageCode;
  state?: string;
  district?: string;
  userId?: string;
  bandwidthKbps?: number;
  history?: ConversationMessage[];
}

export async function converse(input: ConverseInput): Promise<ConverseResponse> {
  const res = await fetch(`${API_BASE}/api/assistant/converse`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      transcript: input.transcript,
      language: input.language,
      state: input.state,
      district: input.district,
      userId: input.userId,
      channel: "WEB",
      bandwidthKbps: input.bandwidthKbps,
    }),
  });
  if (!res.ok) throw new Error(`Assistant error ${res.status}: ${await res.text()}`);
  return res.json();
}

/** The AI-powered understanding pipeline: translates the transcript to
 *  English, semantically matches it against the real NSQF/PM-AJAY catalog
 *  via Gemini, and translates the reply back into the user's language —
 *  see app/api/understand/route.ts. Falls back to the keyword-lexicon
 *  `converse()` above if this call fails for any reason. */
export async function understand(input: ConverseInput): Promise<ConverseResponse> {
  const res = await fetch(`/api/understand`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      transcript: input.transcript,
      language: input.language,
      state: input.state,
      district: input.district,
      userId: input.userId,
      history: input.history,
    }),
  });
  if (!res.ok) throw new Error(`Understand error ${res.status}: ${await res.text()}`);
  return res.json();
}

/** What the Speak screen actually calls: the AI pipeline, falling back to
 *  the plain keyword-lexicon converse() if Gemini or the catalog fetch
 *  fails for any reason — the skill-mapping flow should never go down
 *  just because the AI layer had a bad moment. */
export async function understandSkill(input: ConverseInput): Promise<ConverseResponse> {
  try {
    return await understand(input);
  } catch {
    return converse(input);
  }
}

export interface AskResponse {
  answer: string;
  sources: { documentTitle: string; sourceUrl: string; page: number }[];
  grounded: boolean;
}

export async function ask(question: string, language: LanguageCode): Promise<AskResponse> {
  const res = await fetch(`${API_BASE}/api/assistant/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, language }),
  });
  if (!res.ok) throw new Error(`ask ${res.status}`);
  return res.json();
}

export async function setRecommendationStatus(id: string, status: string): Promise<void> {
  await fetch(`${API_BASE}/api/assistant/recommendations/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
}

export type Gender = "male" | "female" | "other";
export type Education = "below_10th" | "10th" | "12th" | "iti_diploma" | "undergrad" | "postgrad";

export interface AuthUser {
  id: string;
  name: string | null;
  phone: string | null;
  role: "BENEFICIARY" | "ADMIN";
  language: LanguageCode;
  gender?: Gender | null;
  age?: number | null;
  education?: Education | null;
  onboarded?: boolean;
  avatarUrl?: string | null;
}

interface AuthResponse {
  token: string;
  user: AuthUser;
}

async function extractError(res: Response, fallback: string): Promise<string> {
  const body = await res.json().catch(() => null);
  const e = body?.error;
  return typeof e === "string" ? e : fallback;
}

export async function login(phone: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, password }),
  });
  if (!res.ok) throw new Error(await extractError(res, "Invalid phone or password"));
  return res.json();
}

export async function register(input: {
  phone: string;
  password: string;
  name?: string;
  language: LanguageCode;
}): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...input, role: "BENEFICIARY" }),
  });
  if (!res.ok) throw new Error(await extractError(res, "Could not create account"));
  return res.json();
}

export interface ForgotPasswordResponse {
  sent: boolean;
  provider: "mock" | "sms";
  devOtp?: string;
}

export async function forgotPassword(phone: string): Promise<ForgotPasswordResponse> {
  const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone }),
  });
  if (!res.ok) throw new Error(await extractError(res, "No account found with this phone number"));
  return res.json();
}

export async function resetPassword(phone: string, otp: string, newPassword: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, otp, newPassword }),
  });
  if (!res.ok) throw new Error(await extractError(res, "Incorrect code"));
  return res.json();
}

export async function updateProfile(
  token: string,
  input: {
    gender?: Gender;
    age?: number;
    education?: Education;
    onboarded?: boolean;
    avatarUrl?: string | null;
  },
): Promise<{ user: AuthUser }> {
  const res = await fetch(`${API_BASE}/api/auth/profile`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });
  if (res.status === 401 || res.status === 403) throw new UnauthorizedError();
  if (!res.ok) throw new Error(await extractError(res, "Could not save your answer"));
  return res.json();
}
