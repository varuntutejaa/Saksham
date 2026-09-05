export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:4000";

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

export type StitchDeviceType = "MOBILE" | "DESKTOP" | "TABLET" | "AGNOSTIC";
export type StitchModelId = "GEMINI_3_PRO" | "GEMINI_3_FLASH" | "GEMINI_3_1_PRO";

export interface StitchStatus {
  configured: boolean;
  defaultProjectId: string | null;
}

export interface StitchProject {
  projectId: string;
  id: string;
  title: string | null;
}

export interface StitchScreen {
  projectId: string;
  screenId: string;
  htmlUrl?: string;
  imageUrl?: string;
}

async function parseApiError(res: Response, fallback: string) {
  try {
    const body = await res.json();
    return typeof body?.error === "string" ? body.error : fallback;
  } catch {
    return fallback;
  }
}

export async function getStitchStatus(): Promise<StitchStatus> {
  const res = await fetch(`${API_BASE}/api/stitch/status`, { cache: "no-store" });
  if (!res.ok) throw new Error(`stitch status ${res.status}`);
  return res.json();
}

export async function createStitchProject(token: string, title?: string): Promise<StitchProject> {
  const res = await fetch(`${API_BASE}/api/stitch/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new Error(await parseApiError(res, `stitch project ${res.status}`));
  return res.json();
}

export async function generateStitchScreen(
  token: string,
  input: {
    prompt: string;
    projectId?: string;
    projectTitle?: string;
    deviceType?: StitchDeviceType;
    modelId?: StitchModelId;
    includeAssets?: boolean;
  },
): Promise<StitchScreen> {
  const res = await fetch(`${API_BASE}/api/stitch/screens`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await parseApiError(res, `stitch screen ${res.status}`));
  return res.json();
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

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function getPrograms(): Promise<Program[]> {
  const res = await fetch(`${API_BASE}/api/programs?pageSize=50`, { cache: "no-store" });
  if (!res.ok) throw new Error(`programs ${res.status}`);
  const body = (await res.json()) as Paginated<Program>;
  return body.items;
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
