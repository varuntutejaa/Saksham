export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ??
  "https://saksham-api-82mn.onrender.com";

export interface AdminStats {
  totals: {
    sessions: number;
    beneficiaries: number;
    recommendations: number;
    lowBandwidthSessions: number;
  };
  funnel: {
    suggested: number;
    viewed: number;
    interested: number;
    applied: number;
    enrolled: number;
    conversionRate: number;
  };
  byLanguage: { language: string; _count: number }[];
  byStatus: { status: string; _count: number }[];
  topSkills: { normalizedSkill: string; _count: number }[];
}

export interface SessionRow {
  id: string;
  channel: string;
  language: string;
  rawTranscript: string | null;
  detectedSkills: string[];
  bandwidthKbps: number | null;
  state: string | null;
  district: string | null;
  createdAt: string;
  user: { id: string; name: string | null; phone: string | null; district: string | null } | null;
  mappings: {
    id: string;
    normalizedSkill: string;
    confidence: number;
    nsqfQualification: { qpCode: string; title: string; nsqfLevel: number } | null;
  }[];
  recommendations: {
    id: string;
    score: number;
    status: string;
    trainingProgram: { name: string; district: string | null };
  }[];
}

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

/** Thrown when the backend rejects a token as invalid/expired — callers
 *  should clear the stored token and send the user back to login, rather
 *  than showing a generic "could not load" error forever. */
export class UnauthorizedError extends Error {
  constructor() {
    super("Session expired");
    this.name = "UnauthorizedError";
  }
}

function throwIfUnauthorized(res: Response) {
  if (res.status === 401 || res.status === 403) throw new UnauthorizedError();
}

export async function login(phone: string, password: string): Promise<{ token: string; user: unknown }> {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, password }),
  });
  if (!res.ok) throw new Error("Invalid credentials");
  return res.json();
}

export async function getStats(token: string): Promise<AdminStats> {
  const res = await fetch(`${API_BASE}/api/admin/stats`, { headers: authHeaders(token), cache: "no-store" });
  throwIfUnauthorized(res);
  if (!res.ok) throw new Error(`stats ${res.status}`);
  return res.json();
}

export async function getSessions(
  token: string,
  params: { take?: number; skip?: number; state?: string; language?: string } = {},
): Promise<{ total: number; items: SessionRow[] }> {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)]),
  );
  const res = await fetch(`${API_BASE}/api/admin/sessions?${qs}`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  throwIfUnauthorized(res);
  if (!res.ok) throw new Error(`sessions ${res.status}`);
  return res.json();
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
}

export async function getPrograms(): Promise<Program[]> {
  const res = await fetch(`${API_BASE}/api/programs`, { cache: "no-store" });
  if (!res.ok) throw new Error(`programs ${res.status}`);
  const data = await res.json();
  // the API returns a bare array in some deployments and a paginated
  // { items, total, ... } envelope in others — accept either.
  return Array.isArray(data) ? data : (data?.items ?? []);
}

export async function mapSkill(text: string) {
  const res = await fetch(`${API_BASE}/api/nsqf/map`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error(`map ${res.status}`);
  return res.json() as Promise<
    {
      normalizedSkill: string;
      qpCode: string | null;
      title: string | null;
      sector: string | null;
      nsqfLevel: number | null;
      confidence: number;
    }[]
  >;
}
