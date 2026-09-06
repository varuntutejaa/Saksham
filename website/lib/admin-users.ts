import { API_BASE, UnauthorizedError, type SessionRow } from "./api";

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

/** Fetches every session (paginating past the server's take=200 cap) so the
 *  admin Users view can aggregate real activity per beneficiary — there is no
 *  dedicated "list users" endpoint, so this is derived from session history. */
export async function fetchAllSessions(token: string): Promise<SessionRow[]> {
  const all: SessionRow[] = [];
  let skip = 0;
  const take = 200;
  for (;;) {
    const res = await fetch(`${API_BASE}/api/admin/sessions?take=${take}&skip=${skip}`, {
      headers: authHeaders(token),
      cache: "no-store",
    });
    if (res.status === 401 || res.status === 403) throw new UnauthorizedError();
    if (!res.ok) throw new Error(`sessions ${res.status}`);
    const data: { total: number; items: SessionRow[] } = await res.json();
    all.push(...data.items);
    skip += take;
    if (skip >= data.total || data.items.length === 0) break;
  }
  return all;
}

export interface UserProfile {
  id: string;
  name: string | null;
  phone: string | null;
  district: string | null;
  sessions: SessionRow[];
  languages: string[];
  skills: string[];
  firstSeen: string;
  lastSeen: string;
  recommendationCount: number;
  furthestStatus: string | null;
}

const STATUS_RANK = ["SUGGESTED", "VIEWED", "INTERESTED", "APPLIED", "ENROLLED"];

export function groupSessionsByUser(sessions: SessionRow[]): { users: UserProfile[]; guestSessionCount: number } {
  const byUser = new Map<string, UserProfile>();
  let guestSessionCount = 0;

  for (const s of sessions) {
    if (!s.user) {
      guestSessionCount++;
      continue;
    }
    let u = byUser.get(s.user.id);
    if (!u) {
      u = {
        id: s.user.id,
        name: s.user.name,
        phone: s.user.phone,
        district: s.user.district,
        sessions: [],
        languages: [],
        skills: [],
        firstSeen: s.createdAt,
        lastSeen: s.createdAt,
        recommendationCount: 0,
        furthestStatus: null,
      };
      byUser.set(s.user.id, u);
    }
    u.sessions.push(s);
    if (!u.languages.includes(s.language)) u.languages.push(s.language);
    for (const m of s.mappings) {
      if (!u.skills.includes(m.normalizedSkill)) u.skills.push(m.normalizedSkill);
    }
    u.recommendationCount += s.recommendations.length;
    for (const r of s.recommendations) {
      const rank = STATUS_RANK.indexOf(r.status);
      const curRank = u.furthestStatus ? STATUS_RANK.indexOf(u.furthestStatus) : -1;
      if (rank > curRank) u.furthestStatus = r.status;
    }
    if (s.createdAt < u.firstSeen) u.firstSeen = s.createdAt;
    if (s.createdAt > u.lastSeen) u.lastSeen = s.createdAt;
  }

  const users = Array.from(byUser.values()).sort((a, b) => (a.lastSeen < b.lastSeen ? 1 : -1));
  return { users, guestSessionCount };
}
