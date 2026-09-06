import { API_BASE } from "./site-api";

export interface NsqfEntry {
  id: string;
  qpCode: string;
  title: string;
  sector: string;
  nsqfLevel: number;
  keywords: string[];
}

export interface ProgramEntry {
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

interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

async function fetchAllPages<T>(path: string, pageSize: number): Promise<T[]> {
  const first = await fetch(`${API_BASE}${path}?page=1&pageSize=${pageSize}`, { cache: "no-store" });
  if (!first.ok) throw new Error(`${path} ${first.status}`);
  const firstData: Paginated<T> | T[] = await first.json();
  if (Array.isArray(firstData)) return firstData; // bare-array deployments

  const { items, totalPages } = firstData;
  if (totalPages <= 1) return items;

  const rest = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, i) =>
      fetch(`${API_BASE}${path}?page=${i + 2}&pageSize=${pageSize}`, { cache: "no-store" })
        .then((r) => r.json())
        .then((d: Paginated<T>) => d.items),
    ),
  );
  return items.concat(...rest);
}

let cache: { nsqf: NsqfEntry[]; programs: ProgramEntry[]; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 60 * 60 * 1000; // government reference data — refetch hourly at most

/** The real, government-sourced NSQF qualification catalog (1,283 rows) and
 *  PM-AJAY programme list, fetched from the public Saksham API and cached
 *  in-memory for this server instance. Used as grounding data for the AI
 *  understanding pipeline in app/api/understand — the LLM only ever
 *  matches against these real rows, never invents a qualification. */
export async function getCatalog(): Promise<{ nsqf: NsqfEntry[]; programs: ProgramEntry[] }> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) return cache;

  const [nsqfRaw, programs] = await Promise.all([
    fetchAllPages<{
      id: string;
      qpCode: string;
      title: string;
      sector: string;
      nsqfLevel: number;
      keywords: string[];
    }>("/api/nsqf", 50),
    fetchAllPages<ProgramEntry>("/api/programs", 50),
  ]);

  const nsqf = nsqfRaw.map((n) => ({
    id: n.id,
    qpCode: n.qpCode,
    title: n.title,
    sector: n.sector,
    nsqfLevel: n.nsqfLevel,
    keywords: n.keywords ?? [],
  }));

  cache = { nsqf, programs, fetchedAt: Date.now() };
  return cache;
}

/** Compact pipe-delimited text representations, kept small on purpose so
 *  the whole catalog fits comfortably in one Gemini prompt. */
export function nsqfCatalogAsText(nsqf: NsqfEntry[]): string {
  return nsqf.map((n) => `${n.qpCode}|${n.title}|${n.sector}|L${n.nsqfLevel}|${n.keywords.join(",")}`).join("\n");
}

export function programCatalogAsText(programs: ProgramEntry[]): string {
  return programs
    .map(
      (p) =>
        `${p.id}|${p.name}|${p.scheme}${p.component ? "/" + p.component : ""}|${p.sector ?? ""}|L${p.nsqfLevel ?? "?"}|${p.mode}|${p.durationWeeks ?? "?"}w|stipend=${p.stipend}|${p.district ?? ""},${p.state ?? ""}|seats=${p.seatsAvailable ?? "?"}`,
    )
    .join("\n");
}
