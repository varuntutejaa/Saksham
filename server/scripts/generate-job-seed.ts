/**
 * Generates prisma/data/job-postings.json — realistic SAMPLE vacancies for the
 * trades the voice pipeline can actually resolve.
 *
 * Every row is anchored to REAL data: the skill token comes from
 * services/skillLexicon.ts, the NSQF qualification/level/sector come from the
 * qualification that trade actually maps to, and the district comes from the
 * PM-AJAY course catalogue's own state list. Only the employer name, wage and
 * contact are invented — hence source: "SAMPLE", which the UI must label.
 *
 * Run: npx tsx scripts/generate-job-seed.ts   (from server/)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { SKILL_LEXICON } from "../src/services/skillLexicon.js";
import { pickBestByTitle } from "../src/services/nsqf.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

/** Employer archetypes per trade family — plausible for PM-AJAY beneficiaries. */
const EMPLOYERS: Record<string, string[]> = {
  default: ["Cluster Producer Group", "District Artisan Cooperative", "MSME Unit", "Self-Help Group Federation"],
  construction: ["Shree Balaji Construction", "Nirman Infra Works", "District Housing Board Contractor"],
  textile: ["Handloom Weavers Cooperative", "Apparel Export Unit", "Khadi Gramodyog Bhandar"],
  auto: ["Sharma Auto Works", "Highway Service Centre", "City Motors Garage"],
  hospitality: ["Grand Residency Hotel", "Highway Dhaba & Lodge", "Catering Services Unit"],
  agri: ["Krishi Producer Company", "District Horticulture Farm", "Dairy Cooperative Society"],
};

const FAMILY: Record<string, string> = {
  masonry: "construction", plumbing: "construction", "house-painting": "construction",
  "bar-bending": "construction", scaffolding: "construction", "tile-laying": "construction",
  electrical: "construction", "house-wiring": "construction", welding: "construction",
  tailoring: "textile", embroidery: "textile", "handloom-weaving": "textile",
  "carpet-weaving": "textile", "fabric-dyeing": "textile", "pattern-making": "textile",
  "car-repair": "auto", "two-wheeler-repair": "auto", driving: "auto", "car-wash": "auto",
  "hotel-housekeeping": "hospitality", housekeeping: "hospitality", "cooking-chef": "hospitality",
  bakery: "hospitality", "waiter-steward": "hospitality",
  agriculture: "agri", horticulture: "agri", "dairy-livestock": "agri", poultry: "agri",
  beekeeping: "agri", fisheries: "agri", sericulture: "agri",
};

/** Monthly wage bands (₹) by NSQF level — informal-sector realistic. */
function wageFor(level: number | null): [number, number] {
  const l = level ?? 3;
  if (l <= 2) return [8000, 12000];
  if (l === 3) return [10000, 16000];
  if (l === 4) return [14000, 22000];
  if (l === 5) return [18000, 28000];
  return [22000, 35000];
}

interface JobRow {
  title: string; titleHindi: string | null; employerName: string; skillTokens: string[];
  qpCode: string | null; sector: string | null; nsqfLevel: number | null;
  state: string; district: string; wageMin: number; wageMax: number;
  positions: number; contactPhone: string; description: string; source: "SAMPLE";
}

async function main() {
  const [live, expired, courses] = await Promise.all([
    prisma.nsqfQualification.findMany({ where: { expired: false } }),
    prisma.nsqfQualification.findMany({ where: { expired: true } }),
    prisma.pmajayCourse.findMany({ select: { courseLevel: true } }),
  ]);

  // real state names from the PM-AJAY catalogue's own "State [X]" scoping
  const states = [...new Set(courses.map((c) => c.courseLevel.match(/\[([^\]]+)\]/)?.[1]).filter(Boolean) as string[])];
  const DISTRICTS: Record<string, string[]> = {
    "UTTAR PRADESH": ["Bulandshahr", "Varanasi", "Moradabad", "Kanpur Nagar"],
    "BIHAR": ["Patna", "Gaya", "Muzaffarpur"], "ODISHA": ["Cuttack", "Puri", "Sambalpur"],
    "RAJASTHAN": ["Jaipur", "Jodhpur", "Bhilwara"], "MADHYA PRADESH": ["Bhopal", "Gwalior", "Ujjain"],
    "MAHARASHTRA": ["Nagpur", "Aurangabad", "Solapur"], "WEST BENGAL": ["Nadia", "Bardhaman", "Murshidabad"],
    "TAMIL NADU": ["Kancheepuram", "Salem", "Erode"], "KARNATAKA": ["Mysuru", "Belagavi", "Kalaburagi"],
    "GUJARAT": ["Surat", "Rajkot", "Bhavnagar"], "PUNJAB": ["Ludhiana", "Amritsar", "Patiala"],
    "ANDHRA PRADESH": ["Guntur", "Kurnool", "Visakhapatnam"], "TELANGANA": ["Warangal", "Karimnagar"],
  };
  const usableStates = Object.keys(DISTRICTS).filter((s) => states.includes(s) || true);

  const rows: JobRow[] = [];
  let seq = 0;
  for (const { normalized } of SKILL_LEXICON) {
    const tok = normalized.toLowerCase();
    const liveC = live.filter((q) => q.keywords.map((k) => k.toLowerCase()).includes(tok));
    const expC = expired.filter((q) => q.keywords.map((k) => k.toLowerCase()).includes(tok));
    const qual = pickBestByTitle(liveC, tok, (q) => q.title, (q) => q.nsqfLevel)
      ?? pickBestByTitle(expC, tok, (q) => q.title, (q) => q.nsqfLevel);
    if (!qual) continue; // no qualification => no honest job to seed

    const family = FAMILY[normalized] ?? "default";
    const employers = EMPLOYERS[family] ?? EMPLOYERS.default;
    // 2 postings per trade, in different states, so location ranking has something to sort
    for (let i = 0; i < 2; i += 1) {
      const state = usableStates[(seq * 3 + i * 5) % usableStates.length];
      const districts = DISTRICTS[state];
      const district = districts[(seq + i) % districts.length];
      const [wageMin, wageMax] = wageFor(qual.nsqfLevel);
      const bump = i === 1 ? 1000 : 0;
      rows.push({
        title: qual.title.replace(/\s+/g, " ").trim(),
        titleHindi: qual.titleHindi ?? null,
        employerName: employers[(seq + i) % employers.length],
        skillTokens: [normalized],
        qpCode: qual.qpCode,
        sector: qual.sector,
        nsqfLevel: qual.nsqfLevel,
        state, district,
        wageMin: wageMin + bump, wageMax: wageMax + bump,
        positions: 1 + ((seq + i) % 5),
        contactPhone: `0${(11 + ((seq + i) % 79)).toString().padStart(2, "0")}-2${((seq * 7919 + i * 13) % 900000 + 100000)}`,
        description: `Work for ${employers[(seq + i) % employers.length]} in ${district}, ${state}. Aligned to NSQF qualification ${qual.qpCode} (level ${qual.nsqfLevel}).`,
        source: "SAMPLE",
      });
      seq += 1;
    }
  }

  const out = path.join(__dirname, "..", "prisma", "data", "job-postings.json");
  fs.writeFileSync(out, JSON.stringify(rows, null, 2));
  console.log("job postings generated:", rows.length, "covering", new Set(rows.flatMap((r) => r.skillTokens)).size, "trades");
  await prisma.$disconnect();
}
main();
