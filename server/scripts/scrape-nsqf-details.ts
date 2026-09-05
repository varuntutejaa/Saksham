/**
 * Fetches the full NQR detail page for every qualification in
 * prisma/data/nsqf-qualifications.json and captures everything on it that the
 * original scrape discarded.
 *
 * The original pass hit these exact same URLs but kept only `qpCode` and `ssc`.
 * Each page is server-rendered HTML (no browser needed) and also carries the
 * job description, entry requirements, progression pathway, the full NOS
 * breakdown, approval/validity dates, the theory/practical hour split, the
 * awarding + certifying bodies, and the list of occupations the qualification
 * is meant to lead to.
 *
 * Output: prisma/data/nsqf-details.json, keyed by nqrId. The run is
 * resumable — re-running skips ids already present in that file, so an
 * interrupted scrape picks up where it stopped.
 *
 *   npm run scrape:nsqf-details
 *
 * Source: https://www.nqr.gov.in/qualifications/<nqrId> (NCVET). Every field
 * is copied verbatim from the page; nothing is inferred or invented.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const DATA_DIR = join(import.meta.dirname, "..", "prisma", "data");
const SOURCE = join(DATA_DIR, "nsqf-qualifications.json");
const OUT = join(DATA_DIR, "nsqf-details.json");

const CONCURRENCY = 6;
const RETRIES = 3;
const TIMEOUT_MS = 30_000;

export interface EligibilityRow {
  /** minimum education, e.g. "10th", "12th", "Graduate" */
  criteria1: string;
  /** what that education has to be in / its status, e.g. "In any field" */
  criteria2: string;
  experience: string;
  trainingQualification: string;
}

export interface NosRow {
  title: string;
  code: string;
  mandatory: string;
  hours: number | null;
  credits: number | null;
  level: number | null;
}

export interface NsqfDetail {
  nqrId: number;
  qpCode: string | null;
  jobDescription: string | null;
  eligibility: EligibilityRow[];
  progressionPathway: string[];
  nos: NosRow[];
  nsqcNumber: string | null;
  approvedOn: string | null;
  validTill: string | null;
  /** validTill as YYYY-MM-DD, for comparison */
  validTillIso: string | null;
  /** true when validTill is in the past — an expired qualification */
  expired: boolean;
  notionalHoursMin: number | null;
  notionalHoursMax: number | null;
  theoryHours: number | null;
  practicalHours: number | null;
  employabilityHours: number | null;
  ojtHours: string | null;
  awardingBodies: string[];
  organisationType: string | null;
  certifyingBodies: string[];
  proposedOccupations: string[];
  qualificationType: string | null;
  applicability: string | null;
  adopted: string | null;
  scrapedAt: string;
}

const stripTags = (html: string) => html.replace(/<[^>]+>/g, " ");

function decode(text: string): string {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;|&rsquo;/g, "'")
    .replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

const clean = (text: string) => decode(stripTags(text)).replace(/\s+/g, " ").trim();

function toNumber(value: string | null | undefined): number | null {
  if (!value) return null;
  const match = value.replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  if (!match) return null;
  const n = Number(match[0]);
  return Number.isFinite(n) ? n : null;
}

const orNull = (value: string | undefined | null) => {
  const v = value?.replace(/\s+/g, " ").trim();
  if (!v || /^(n\.?\s?a\.?|n\/a|none|-|nil)$/i.test(v)) return null;
  return v;
};

/** NQR prints dates as DD/MM/YYYY. */
function toIsoDate(value: string | null): string | null {
  const m = value?.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

/** Rows of a <table>, as arrays of cleaned cell text (header row dropped). */
function tableRows(tableHtml: string): string[][] {
  const rows = [...tableHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map((m) =>
    [...m[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((c) => clean(c[1])),
  );
  return rows.filter((cells) => cells.length > 0 && cells.some(Boolean)).slice(1);
}

/** The `<li>` values under a `<h4>Label</h4>` block in the side panel. */
function listUnderHeading(html: string, label: string): string[] {
  const heading = new RegExp(`<h4[^>]*>\\s*${label}\\s*</h4>([\\s\\S]{0,1200}?)(?=<li class="item"|</div>)`, "i");
  const block = html.match(heading);
  if (!block) return [];
  return [...block[1].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
    .map((m) => orNull(clean(m[1])))
    .filter((v): v is string => Boolean(v));
}

/** A `Label : value` pair inside the hour-breakdown panel. */
function labelledValue(html: string, label: string): string | null {
  const match = html.match(new RegExp(`${label}\\s*:\\s*([^<]{0,40})`, "i"));
  return match ? orNull(clean(match[1])) : null;
}

export function parseDetail(nqrId: number, html: string): NsqfDetail {
  const qpCode = orNull(html.match(/NQR Code:\s*<span[^>]*>([^<]+)</i)?.[1]);

  const jobDescription = orNull(
    clean(html.match(/<h2>\s*Job Description\s*<\/h2>[\s\S]{0,200}?<p>([\s\S]*?)<\/p>/i)?.[1] ?? ""),
  );

  const eligibilityTable = html.match(/<table class="elg">([\s\S]*?)<\/table>/i)?.[1] ?? "";
  const eligibility: EligibilityRow[] = tableRows(eligibilityTable)
    .filter((cells) => cells.length >= 4)
    .map((cells) => ({
      criteria1: cells[0],
      criteria2: cells[1],
      experience: cells[2],
      trainingQualification: cells[3],
    }))
    .filter((row) => row.criteria1);

  const pathwayBlock = html.match(/<h3>\s*Progression Pathway\s*<\/h3>\s*<ul>([\s\S]*?)<\/ul>/i)?.[1] ?? "";
  const progressionPathway = [...pathwayBlock.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
    .map((m) => orNull(clean(m[1]).replace(/^●\s*/, "")))
    .filter((v): v is string => Boolean(v));

  const nosTable =
    html.match(/Learning Module In Job Role\/Qualifcation[\s\S]*?<table[^>]*>([\s\S]*?)<\/table>/i)?.[1] ?? "";
  const nos: NosRow[] = tableRows(nosTable)
    .filter((cells) => cells.length >= 6 && cells[1])
    .map((cells) => ({
      title: cells[0],
      code: cells[1],
      mandatory: cells[2],
      hours: toNumber(cells[3]),
      credits: toNumber(cells[4]),
      level: toNumber(cells[5]),
    }));

  const notionalBlock = html.match(/<label>\s*Notional Hours\s*<\/label>([\s\S]{0,3000}?)<\/li>/i)?.[1] ?? "";
  const deliveryBlock = html.match(/<label>\s*Training Delivery Hours\s*<\/label>([\s\S]{0,3000}?)<\/li>/i)?.[1] ?? "";

  const approvedOn = orNull(html.match(/Originally Approved:\s*(?:<br\s*\/?>)?\s*([^<]*)/i)?.[1]);
  const validTill = orNull(html.match(/Valid Till:\s*([^<]*)/i)?.[1]);
  const validTillIso = toIsoDate(validTill);
  const today = new Date().toISOString().slice(0, 10);

  return {
    nqrId,
    qpCode,
    jobDescription,
    eligibility,
    progressionPathway,
    nos,
    nsqcNumber: orNull(html.match(/NSQC:\s*([^<]{0,40})/i)?.[1]?.trim()),
    approvedOn,
    validTill,
    validTillIso,
    expired: validTillIso ? validTillIso < today : false,
    notionalHoursMin: toNumber(labelledValue(notionalBlock, "Minimum")),
    notionalHoursMax: toNumber(labelledValue(notionalBlock, "Maximum")),
    theoryHours: toNumber(labelledValue(deliveryBlock, "Theory")),
    practicalHours: toNumber(labelledValue(deliveryBlock, "Practical")),
    employabilityHours: toNumber(labelledValue(deliveryBlock, "EmployabilitySkills")),
    ojtHours: labelledValue(deliveryBlock, "OJT\\(Mandatory\\)"),
    awardingBodies: listUnderHeading(html, "Awarding Bodies"),
    organisationType: orNull(listUnderHeading(html, "Type of Organisation")[0]),
    certifyingBodies: listUnderHeading(html, "Certifying Bodies"),
    // the page prints these as one semicolon-separated string
    proposedOccupations: (listUnderHeading(html, "Proposed Occupation")[0] ?? "")
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s && s !== "N.A."),
    qualificationType: orNull(listUnderHeading(html, "Qualifcation Type")[0]),
    applicability: orNull(listUnderHeading(html, "Qualifcation By Applicability")[0]),
    adopted: orNull(html.match(/Adopted Qualifcation:\s*([^<]*)/i)?.[1]),
    scrapedAt: new Date().toISOString(),
  };
}

async function fetchDetail(nqrId: number): Promise<NsqfDetail | null> {
  const url = `https://www.nqr.gov.in/qualifications/${nqrId}`;
  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { "User-Agent": "Saksham/1.0 (PM-AJAY livelihood mapping; contact via github.com/varuntutejaa/Saksham)" },
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      if (!html.includes("NQR Code")) throw new Error("unexpected page shape");
      return parseDetail(nqrId, html);
    } catch (err) {
      if (attempt === RETRIES) {
        console.error(`  ✗ ${nqrId}: ${err instanceof Error ? err.message : String(err)}`);
        return null;
      }
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }
  return null;
}

async function main() {
  const source = JSON.parse(readFileSync(SOURCE, "utf8")) as { nqrId?: number; title: string }[];
  const ids = [...new Set(source.map((q) => q.nqrId).filter((id): id is number => typeof id === "number"))];

  const existing: Record<string, NsqfDetail> = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : {};
  const todo = ids.filter((id) => !existing[String(id)]);

  console.log(`${ids.length} qualifications · ${ids.length - todo.length} already scraped · ${todo.length} to fetch`);
  if (todo.length === 0) return;

  let done = 0;
  let failed = 0;
  const queue = [...todo];

  async function worker() {
    while (queue.length) {
      const id = queue.shift();
      if (id === undefined) return;
      const detail = await fetchDetail(id);
      if (detail) existing[String(id)] = detail;
      else failed++;
      done++;
      if (done % 25 === 0 || queue.length === 0) {
        writeFileSync(OUT, JSON.stringify(existing, null, 2));
        console.log(`  ${done}/${todo.length} fetched (${failed} failed)`);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  writeFileSync(OUT, JSON.stringify(existing, null, 2));

  const rows = Object.values(existing);
  const has = (predicate: (d: NsqfDetail) => boolean) => rows.filter(predicate).length;
  console.log(`\nWrote ${rows.length} rows to prisma/data/nsqf-details.json (${failed} failed this run)`);
  console.log(`  job description:      ${has((d) => Boolean(d.jobDescription))}`);
  console.log(`  eligibility rows:     ${has((d) => d.eligibility.length > 0)}`);
  console.log(`  progression pathway:  ${has((d) => d.progressionPathway.length > 0)}`);
  console.log(`  NOS breakdown:        ${has((d) => d.nos.length > 0)}`);
  console.log(`  proposed occupations: ${has((d) => d.proposedOccupations.length > 0)}`);
  console.log(`  valid-till date:      ${has((d) => Boolean(d.validTill))}`);
  console.log(`  NQR code:             ${has((d) => Boolean(d.qpCode))}`);
  console.log(`  theory/practical split: ${has((d) => d.theoryHours != null)}`);
  console.log(`\n  LIVE (not expired):   ${has((d) => !d.expired)}`);
  console.log(`  EXPIRED:              ${has((d) => d.expired)}`);
}

// only scrape when run directly — importing this file (e.g. to reuse
// parseDetail) must not kick off 1,283 network requests
if (process.argv[1] && import.meta.filename === process.argv[1]) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
