import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import nsqfData from "./data/nsqf-qualifications.json" with { type: "json" };
import pmajayCourseData from "./data/pmajay-courses.json" with { type: "json" };
import knowledgeChunkData from "./data/knowledge-chunks.json" with { type: "json" };

const prisma = new PrismaClient();

/**
 * 1,283 real NSQF qualifications scraped from nqr.gov.in — see
 * prisma/data/README.md for provenance and known gaps.
 */
const NSQF = nsqfData as {
  qpCode: string;
  title: string;
  titleHindi: string | null;
  sector: string;
  nsqfLevel: number;
  ssc: string | null;
  notionalHours: number | null;
  keywords: string[];
  nqrId: number;
}[];

/**
 * 2,366 real PM-AJAY-eligible courses scraped from pmajay.dosje.gov.in/CourseList
 * — see prisma/data/README-pmajay-courses.md for provenance.
 */
const PMAJAY_COURSES = pmajayCourseData as {
  srNo: number;
  courseLevel: string;
  sector: string;
  subSector: string;
  courseName: string;
  subCourseCode: string;
  subCourseName: string;
  keywords: string[];
}[];

/**
 * 177 chunks from 2 real government PDFs (PM-AJAY guidelines, NSQF gazette
 * notification) — see prisma/data/README-knowledge-base.md for provenance.
 */
const KNOWLEDGE_CHUNKS = knowledgeChunkData as {
  documentTitle: string;
  sourceUrl: string;
  page: number;
  chunkIndex: number;
  text: string;
}[];

async function main() {
  console.log("Clearing old NSQF qualifications (replaced by the real nqr.gov.in scrape)…");
  // qpCode formats differ from any earlier hand-authored batch, so upsert alone
  // would leave stale rows behind — wipe the table first. Safe: both
  // SkillMapping and TrainingProgram set their FK to null on delete.
  await prisma.nsqfQualification.deleteMany({});

  console.log("Seeding NSQF qualifications…");
  const qualByKeyword = new Map<string, string>();
  for (const q of NSQF) {
    const rec = await prisma.nsqfQualification.upsert({
      where: { qpCode: q.qpCode },
      update: q,
      create: q,
    });
    for (const k of q.keywords) qualByKeyword.set(k, rec.id);
  }

  console.log("Clearing old PM-AJAY courses…");
  await prisma.pmajayCourse.deleteMany({});
  console.log("Seeding PM-AJAY courses…");
  await prisma.pmajayCourse.createMany({ data: PMAJAY_COURSES });

  console.log("Clearing old knowledge-base chunks…");
  await prisma.knowledgeChunk.deleteMany({});
  console.log("Seeding knowledge-base chunks…");
  await prisma.knowledgeChunk.createMany({ data: KNOWLEDGE_CHUNKS });

  console.log("Seeding PM-AJAY training programmes…");
  const programs = [
    {
      name: "PM-AJAY Skill Development — Pottery & Terracotta, Khurja",
      nameHindi: "पीएम-अजय कौशल विकास — मृद्भांड, खुर्जा",
      component: "Skill Development",
      providerName: "District Rural Development Agency, Bulandshahr",
      keyword: "pottery",
      sector: "Handicrafts & Carpet",
      nsqfLevel: 4,
      mode: "OFFLINE",
      durationWeeks: 12,
      stipend: true,
      certification: "NSQF Level 4 (NSDC)",
      state: "Uttar Pradesh",
      district: "Bulandshahr",
      contactPhone: "05732-000000",
      seatsTotal: 40,
      seatsAvailable: 12,
      eligibilityNote: "SC beneficiaries under PM-AJAY, age 18–45",
    },
    {
      name: "PM-AJAY GIA — Self Employed Tailoring Batch, Nagpur",
      nameHindi: "पीएम-अजय — स्वरोजगार सिलाई बैच, नागपुर",
      component: "GIA",
      providerName: "State SC Development Corporation, Maharashtra",
      keyword: "tailoring",
      sector: "Apparel, Made-ups & Home Furnishing",
      nsqfLevel: 4,
      mode: "OFFLINE",
      durationWeeks: 10,
      stipend: true,
      certification: "NSQF Level 4 (AMHSSC)",
      state: "Maharashtra",
      district: "Nagpur",
      contactPhone: "0712-000000",
      seatsTotal: 30,
      seatsAvailable: 8,
      eligibilityNote: "SC women prioritised; free tool-kit on completion",
    },
    {
      name: "PM-AJAY Adarsh Gram — Handloom Weaving Centre, Bhagalpur",
      nameHindi: "पीएम-अजय आदर्श ग्राम — हथकरघा केंद्र, भागलपुर",
      component: "Adarsh Gram",
      providerName: "Weavers Service Centre, Bhagalpur",
      keyword: "handloom-weaving",
      sector: "Handloom",
      nsqfLevel: 4,
      mode: "OFFLINE",
      durationWeeks: 16,
      stipend: true,
      certification: "NSQF Level 4 (HSSC)",
      state: "Bihar",
      district: "Bhagalpur",
      contactPhone: "0641-000000",
      seatsTotal: 25,
      seatsAvailable: 15,
      eligibilityNote: "Residents of PM-AJAY Adarsh Gram villages",
    },
    {
      name: "PM-AJAY Skill Development — Footwear & Leather, Agra",
      nameHindi: "पीएम-अजय — जूता एवं चर्म, आगरा",
      component: "Skill Development",
      providerName: "Footwear Design & Development Institute, Agra",
      keyword: "leatherwork",
      sector: "Leather",
      nsqfLevel: 3,
      mode: "HYBRID",
      durationWeeks: 8,
      stipend: false,
      certification: "NSQF Level 3 (LSSC)",
      state: "Uttar Pradesh",
      district: "Agra",
      contactPhone: "0562-000000",
      seatsTotal: 50,
      seatsAvailable: 22,
      eligibilityNote: "SC beneficiaries; placement linkage with local units",
    },
    {
      name: "PM-AJAY GIA — Assistant Mason & Carpenter, Jaipur",
      nameHindi: "पीएम-अजय — सहायक राजमिस्त्री एवं बढ़ई, जयपुर",
      component: "GIA",
      providerName: "CSDCI Accredited Centre, Jaipur",
      keyword: "masonry",
      sector: "Construction",
      nsqfLevel: 3,
      mode: "OFFLINE",
      durationWeeks: 6,
      stipend: true,
      certification: "NSQF Level 3 (CSDCI)",
      state: "Rajasthan",
      district: "Jaipur",
      contactPhone: "0141-000000",
      seatsTotal: 60,
      seatsAvailable: 30,
      eligibilityNote: "SC beneficiaries, age 18–50; on-site training",
    },
    {
      name: "PM-AJAY Skill Development — Dairy Entrepreneurship, Anand",
      nameHindi: "पीएम-अजय — डेयरी उद्यमिता, आणंद",
      component: "Skill Development",
      providerName: "Amul Dairy Training Centre, Anand",
      keyword: "dairy-livestock",
      sector: "Agriculture",
      nsqfLevel: 4,
      mode: "OFFLINE",
      durationWeeks: 4,
      stipend: false,
      certification: "NSQF Level 4 (ASCI)",
      state: "Gujarat",
      district: "Anand",
      contactPhone: "02692-000000",
      seatsTotal: 35,
      seatsAvailable: 18,
      eligibilityNote: "SC beneficiaries owning/leasing cattle; credit linkage",
    },
    {
      name: "PM-AJAY GIA — Beauty & Wellness Batch, Lucknow",
      nameHindi: "पीएम-अजय — ब्यूटी एवं वेलनेस, लखनऊ",
      component: "GIA",
      providerName: "B&WSSC Accredited Centre, Lucknow",
      keyword: "beautician",
      sector: "Beauty & Wellness",
      nsqfLevel: 3,
      mode: "OFFLINE",
      durationWeeks: 8,
      stipend: true,
      certification: "NSQF Level 3 (B&WSSC)",
      state: "Uttar Pradesh",
      district: "Lucknow",
      contactPhone: "0522-000000",
      seatsTotal: 30,
      seatsAvailable: 9,
      eligibilityNote: "SC women prioritised; salon placement support",
    },
    {
      name: "PM-AJAY Skill Development — Food Processing (Pickles & Papad), Bhopal",
      nameHindi: "पीएम-अजय — खाद्य प्रसंस्करण, भोपाल",
      component: "Skill Development",
      providerName: "FICSI Accredited Centre, Bhopal",
      keyword: "food-processing",
      sector: "Food Processing",
      nsqfLevel: 4,
      mode: "OFFLINE",
      durationWeeks: 6,
      stipend: true,
      certification: "NSQF Level 4 (FICSI)",
      state: "Madhya Pradesh",
      district: "Bhopal",
      contactPhone: "0755-000000",
      seatsTotal: 40,
      seatsAvailable: 25,
      eligibilityNote: "SC SHG members prioritised; FSSAI registration support",
    },
    {
      name: "PM-AJAY GIA — Domestic Electrician, Hyderabad",
      nameHindi: "पीएम-अजय — घरेलू इलेक्ट्रीशियन, हैदराबाद",
      component: "GIA",
      providerName: "ESSCI Accredited Centre, Hyderabad",
      keyword: "electrical",
      sector: "Electronics",
      nsqfLevel: 4,
      mode: "OFFLINE",
      durationWeeks: 10,
      stipend: true,
      certification: "NSQF Level 4 (ESSCI)",
      state: "Telangana",
      district: "Hyderabad",
      contactPhone: "040-00000000",
      seatsTotal: 45,
      seatsAvailable: 20,
      eligibilityNote: "SC beneficiaries, min. class 8; wage-employment linkage",
    },
    {
      name: "PM-AJAY Skill Development — Mobile Phone Repair, Patna",
      nameHindi: "पीएम-अजय — मोबाइल रिपेयर, पटना",
      component: "Skill Development",
      providerName: "ESSCI Accredited Centre, Patna",
      keyword: "mobile-repair",
      sector: "Electronics",
      nsqfLevel: 4,
      mode: "HYBRID",
      durationWeeks: 8,
      stipend: false,
      certification: "NSQF Level 4 (ESSCI)",
      state: "Bihar",
      district: "Patna",
      contactPhone: "0612-000000",
      seatsTotal: 40,
      seatsAvailable: 28,
      eligibilityNote: "SC youth, age 18–35; self-employment tool-kit",
    },
    {
      name: "PM-AJAY GIA — Cane & Bamboo Craft, Guwahati",
      nameHindi: "पीएम-अजय — बेंत एवं बांस शिल्प, गुवाहाटी",
      component: "GIA",
      providerName: "Cane & Bamboo Technology Centre, Guwahati",
      keyword: "handicraft-bamboo",
      sector: "Handicrafts & Carpet",
      nsqfLevel: 4,
      mode: "OFFLINE",
      durationWeeks: 12,
      stipend: true,
      certification: "NSQF Level 4 (HCSSC)",
      state: "Assam",
      district: "Kamrup Metropolitan",
      contactPhone: "0361-000000",
      seatsTotal: 30,
      seatsAvailable: 14,
      eligibilityNote: "SC artisans; market linkage with SFURTI cluster",
    },
    {
      name: "PM-AJAY Skill Development — General Duty Assistant, Delhi",
      nameHindi: "पीएम-अजय — सामान्य ड्यूटी सहायक, दिल्ली",
      component: "Skill Development",
      providerName: "HSSC Accredited Centre, New Delhi",
      keyword: "healthcare-support",
      sector: "Healthcare",
      nsqfLevel: 4,
      mode: "OFFLINE",
      durationWeeks: 14,
      stipend: true,
      certification: "NSQF Level 4 (HSSC)",
      state: "Delhi",
      district: "New Delhi",
      contactPhone: "011-00000000",
      seatsTotal: 50,
      seatsAvailable: 19,
      eligibilityNote: "SC beneficiaries, class 10 pass; hospital placement",
    },
  ];

  for (const p of programs) {
    const { keyword, ...rest } = p;
    await prisma.trainingProgram.upsert({
      where: { id: slug(p.name) },
      update: { ...rest, nsqfQualificationId: qualByKeyword.get(keyword) ?? null },
      create: {
        id: slug(p.name),
        ...rest,
        nsqfQualificationId: qualByKeyword.get(keyword) ?? null,
      },
    });
  }

  console.log("Seeding demo users…");
  await prisma.user.upsert({
    where: { phone: "9999900000" },
    update: {},
    create: {
      phone: "9999900000",
      name: "Admin (MoSJE)",
      role: "ADMIN",
      passwordHash: await bcrypt.hash("admin123", 10),
      language: "en",
    },
  });
  await prisma.user.upsert({
    where: { phone: "9000000001" },
    update: {},
    create: {
      phone: "9000000001",
      name: "Ramesh (demo beneficiary)",
      role: "BENEFICIARY",
      passwordHash: await bcrypt.hash("demo123", 10),
      language: "hi",
      category: "SC",
      state: "Uttar Pradesh",
      district: "Bulandshahr",
    },
  });

  console.log("Done.");
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
