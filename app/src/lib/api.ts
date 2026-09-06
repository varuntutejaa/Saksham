import Constants from 'expo-constants';
import { Platform } from 'react-native';

/** The deployed backend. Used by default so a fresh clone works with no setup:
 *  `npm start` and the app talks to the real API, same as website/lib/site-api.ts. */
export const DEFAULT_API_URL = 'https://saksham-api-82mn.onrender.com';

/**
 * Resolve the backend base URL.
 *  - Defaults to the deployed Render backend, so cloning and running needs no
 *    configuration and every developer sees the same data.
 *  - Set EXPO_PUBLIC_API_URL to point somewhere else — most usefully
 *    http://localhost:4000 when working on the server itself. On a physical
 *    device that address is the phone, not your laptop, so
 *    EXPO_PUBLIC_API_URL=lan resolves your machine's LAN IP from the Expo dev
 *    server instead.
 */
function resolveBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.trim();

  if (fromEnv && fromEnv.toLowerCase() !== 'lan') return fromEnv.replace(/\/$/, '');

  if (fromEnv?.toLowerCase() === 'lan') {
    const hostUri =
      Constants.expoConfig?.hostUri ??
      (Constants as { manifest2?: { extra?: { expoClient?: { hostUri?: string } } } }).manifest2
        ?.extra?.expoClient?.hostUri;
    const host = hostUri?.split(':')[0];
    if (host && Platform.OS !== 'web') return `http://${host}:4000`;
    return 'http://localhost:4000';
  }

  return DEFAULT_API_URL;
}

export const API_BASE = resolveBaseUrl();

export type LanguageCode =
  | 'hi' | 'en' | 'bn' | 'ta' | 'te' | 'mr' | 'kn' | 'gu' | 'pa' | 'or';

export type StitchDeviceType = 'MOBILE' | 'DESKTOP' | 'TABLET' | 'AGNOSTIC';
export type StitchModelId = 'GEMINI_3_PRO' | 'GEMINI_3_FLASH' | 'GEMINI_3_1_PRO';

export interface StitchStatus {
  configured: boolean;
  defaultProjectId: string | null;
}

export interface StitchScreen {
  projectId: string;
  screenId: string;
  htmlUrl?: string;
  imageUrl?: string;
}

export async function getStitchStatus(): Promise<StitchStatus> {
  const res = await fetch(`${API_BASE}/api/stitch/status`);
  if (!res.ok) throw new Error(`stitch status ${res.status}`);
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
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await extractError(res, `stitch screen ${res.status}`));
  return res.json();
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
  /** true if this skill also has a real, currently PM-AJAY-fundable course
   *  (independent of the NSQF match above — see server/prisma/data/README-pmajay-courses.md) */
  pmajayVerified: boolean;
  pmajayCourse: { subCourseCode: string; subCourseName: string; sector: string } | null;
  /** true when the matched qualification's NQR validity has lapsed. Shown with
   *  a "certification lapsed" label — many lapsed trades (pottery, basket
   *  making) still have live PM-AJAY training courses. */
  nsqfExpired?: boolean;
  /** Real job titles this qualification leads to (NQR "proposed occupations").
   *  The catalogue holds no vacancies, so this is what "find work" answers with. */
  proposedOccupations?: string[];
}

/** A job vacancy matched to the beneficiary's spoken skill.
 *  `source` is provenance and MUST be shown: "SAMPLE" rows are demonstration
 *  vacancies (anchored to real NSQF qualifications and real districts, but not
 *  live openings); "EMPLOYER" rows were posted through the Saksham portal. */
export interface JobMatch {
  jobPostingId: string;
  title: string;
  titleHindi: string | null;
  employerName: string;
  sector: string | null;
  nsqfLevel: number | null;
  state: string | null;
  district: string | null;
  wageMin: number | null;
  wageMax: number | null;
  positions: number | null;
  contactPhone: string | null;
  source: string;
  score: number;
  /** job asks a higher NSQF level than the beneficiary has — reachable with training */
  needsUpskilling: boolean;
  nsqfQpCode: string | null;
  nsqfTitle: string | null;
}

/** A real PM-AJAY course (one of the 2,366 in the government catalogue),
 *  scored against the NSQF qualification the spoken skill mapped to. */
export interface CourseRecommendation {
  recommendationId?: string;
  pmajayCourseId: string;
  subCourseCode: string;
  subCourseName: string;
  courseName: string;
  sector: string;
  subSector: string;
  courseLevel: string;
  nsqfQpCode: string | null;
  nsqfTitle: string | null;
  nsqfLevel: number | null;
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

export interface EligibilityRow {
  criteria1: string;
  criteria2: string;
  experience: string;
  trainingQualification: string;
}

export interface NsqfQualification {
  id: string;
  qpCode: string;
  title: string;
  titleHindi: string | null;
  sector: string;
  nsqfLevel: number;
  ssc: string | null;
  notionalHours: number | null;
  /** the NQR "Job Description" prose */
  description: string | null;
  /** lowest entry bar across the eligibility rows, on the same ladder as
   *  the education we collect during onboarding */
  minEducation: Education | 'none' | null;
  eligibility: EligibilityRow[] | null;
  /** job titles this qualification leads to */
  proposedOccupations: string[];
  progressionPathway: string[];
  awardingBodies: string[];
  certifyingBodies: string[];
  organisationType: string | null;
  validTill: string | null;
  expired: boolean;
  theoryHours: number | null;
  practicalHours: number | null;
  applicability: string | null;
}

export interface PmajayCourse {
  id: string;
  courseLevel: string;
  sector: string;
  subSector: string;
  courseName: string;
  subCourseCode: string;
  subCourseName: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** The catalogues are large (1,283 NSQF QPs, 2,366 PM-AJAY courses) — every
 *  list endpoint is paginated; the browse screen requests 5 rows at a time. */
export const CATALOG_PAGE_SIZE = 5;

function catalogQuery(params: Record<string, string | number | undefined>): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') qs.set(key, String(value));
  }
  return qs.toString() ? `?${qs}` : '';
}

async function getPage<T>(path: string, params: Record<string, string | number | undefined>): Promise<Paginated<T>> {
  const res = await fetch(`${API_BASE}${path}${catalogQuery(params)}`);
  if (!res.ok) throw new Error(`${path} ${res.status}`);
  return res.json();
}

export function getPrograms(
  params: {
    state?: string;
    district?: string;
    preferredState?: string;
    preferredDistrict?: string;
    sector?: string;
    q?: string;
    page?: number;
    pageSize?: number;
  } = {},
): Promise<Paginated<Program>> {
  return getPage<Program>('/api/programs', { pageSize: CATALOG_PAGE_SIZE, ...params });
}

export function getNsqfQualifications(
  params: { sector?: string; level?: number; q?: string; page?: number; pageSize?: number } = {},
): Promise<Paginated<NsqfQualification>> {
  return getPage<NsqfQualification>('/api/nsqf', { pageSize: CATALOG_PAGE_SIZE, ...params });
}

export function getPmajayCourses(
  params: { sector?: string; courseLevel?: string; preferredState?: string; q?: string; page?: number; pageSize?: number } = {},
): Promise<Paginated<PmajayCourse>> {
  return getPage<PmajayCourse>('/api/pmajay-courses', { pageSize: CATALOG_PAGE_SIZE, ...params });
}

export async function getCatalogFilters(
  kind: 'programs' | 'nsqf' | 'pmajay-courses',
): Promise<{ sectors: string[]; levels?: number[]; courseLevels?: string[] }> {
  const res = await fetch(`${API_BASE}/api/${kind}/filters`);
  if (!res.ok) throw new Error(`${kind} filters ${res.status}`);
  return res.json();
}

export interface ConverseResponse {
  sessionId: string;
  transcript: string;
  language?: LanguageCode;
  stt?: { provider: string; confidence: number; language?: LanguageCode };
  mappings: NsqfMapping[];
  recommendations: CourseRecommendation[];
  jobs?: JobMatch[];
  reply: { text: string; audioUrl: string; format: string };
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  text: string;
}

interface ConverseInput {
  transcript?: string;
  audioUri?: string;
  language: LanguageCode;
  state?: string;
  district?: string;
  userId?: string;
  channel?: 'APP' | 'WEB' | 'IVR';
  bandwidthKbps?: number;
  history?: ConversationMessage[];
  autoDetectLanguage?: boolean;
}

export async function converse(input: ConverseInput): Promise<ConverseResponse> {
  const form = new FormData();
  form.append('language', input.language);
  form.append('channel', input.channel ?? 'APP');
  if (input.transcript) form.append('transcript', input.transcript);
  if (input.state) form.append('state', input.state);
  if (input.district) form.append('district', input.district);
  if (input.userId) form.append('userId', input.userId);
  if (input.bandwidthKbps) form.append('bandwidthKbps', String(input.bandwidthKbps));
  if (input.history?.length) form.append('history', JSON.stringify(input.history.slice(-8)));
  form.append('autoDetectLanguage', String(input.autoDetectLanguage ?? true));
  if (input.audioUri) {
    // React Native's FormData accepts a { uri, name, type } file descriptor.
    form.append('audio', {
      uri: input.audioUri,
      name: 'speech.m4a',
      type: 'audio/x-m4a',
    } as unknown as Blob);
  }

  try {
    const res = await fetch(`${API_BASE}/api/assistant/converse`, {
      method: 'POST',
      body: form,
    });
    if (!res.ok) throw new Error(`Assistant error ${res.status}: ${await res.text()}`);
    const result = (await res.json()) as ConverseResponse;
    const hasKnownSkill = result.mappings.some((m) => m.normalizedSkill !== 'unknown' && (m.title || m.qpCode));
    if (!hasKnownSkill && result.transcript) {
      const local = localConverse(result.transcript, result.language ?? input.language, input.state, input.district, input.history);
      const localHasKnownSkill = local.mappings.some((m) => m.normalizedSkill !== 'unknown' && (m.title || m.qpCode));
      if (localHasKnownSkill) return { ...local, sessionId: result.sessionId, stt: result.stt };
    }
    return result;
  } catch {
    if (!input.transcript) throw new Error('Assistant server is unavailable');
    return localConverse(input.transcript, input.language, input.state, input.district, input.history);
  }
}

/**
 * Re-rank an existing session's recommendations for the intent the user picked
 * on the confirm screen. Not a second converse() — it reuses the stored
 * transcript server-side, so no duplicate session appears in the admin funnel.
 * Ranking only: the same courses come back reordered, never filtered.
 */
export async function reprioritise(
  sessionId: string,
  intent: 'jobs' | 'training' | 'certificate' | 'guidance',
  location?: { state?: string | null; district?: string | null },
): Promise<{ mappings: NsqfMapping[]; recommendations: CourseRecommendation[]; jobs?: JobMatch[] } | null> {
  try {
    const res = await fetch(`${API_BASE}/api/assistant/reprioritise`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, intent, state: location?.state, district: location?.district }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    // offline or server down — keep the ordering we already have
    return null;
  }
}

export type ProfileField = 'name' | 'gender' | 'age' | 'education' | 'experienceYears' | 'workPreference';

const HINDI_AGE_WORDS: [RegExp, number][] = [
  [/\b(ek|one)\b|एक/u, 1],
  [/\b(do|two)\b|दो/u, 2],
  [/\b(teen|three)\b|तीन/u, 3],
  [/\b(chaar|char|four)\b|चार/u, 4],
  [/\b(paanch|panch|five)\b|पांच|पाँच/u, 5],
  [/\b(chhe|cheh|six)\b|छह|छः/u, 6],
  [/\b(saat|seven)\b|सात/u, 7],
  [/\b(aath|eight)\b|आठ/u, 8],
  [/\b(nau|nine)\b|नौ/u, 9],
  [/\b(das|dus)\b|दस/u, 10],
  [/\b(gyarah|gyaarah)\b|ग्यारह/u, 11],
  [/\b(barah|baarah)\b|बारह/u, 12],
  [/\b(terah|tera)\b|तेरह/u, 13],
  [/\b(chaudah|choda)\b|चौदह/u, 14],
  [/\b(pandrah|pandra)\b|पंद्रह/u, 15],
  [/\b(solah|sola)\b|सोलह/u, 16],
  [/\b(satrah|satra)\b|सत्रह/u, 17],
  [/\b(atharah|athara)\b|अठारह/u, 18],
  [/\b(unnis|unees)\b|उन्नीस/u, 19],
  [/\b(bees|bis)\b|बीस/u, 20],
  [/\b(pachis|pachees)\b|पच्चीस/u, 25],
  [/\b(tis|tees)\b|तीस/u, 30],
  [/\b(chalis|chaalis)\b|चालीस/u, 40],
  [/\b(pachas|pachaas)\b|पचास/u, 50],
  [/\b(sath|saath)\b|साठ/u, 60],
  [/\b(sattar)\b|सत्तर/u, 70],
  [/\b(assi|asi)\b|अस्सी/u, 80],
  [/\b(nabbe)\b|नब्बे/u, 90],
  [/\b(sau|sao)\b|सौ/u, 100],
];

const URDU_AGE_WORDS: [RegExp, number][] = [
  [/ایک/u, 1],
  [/دو/u, 2],
  [/تین/u, 3],
  [/چار/u, 4],
  [/پانچ/u, 5],
  [/چھ/u, 6],
  [/سات/u, 7],
  [/آٹھ/u, 8],
  [/نو/u, 9],
  [/دس/u, 10],
  [/گیارہ/u, 11],
  [/بارہ/u, 12],
  [/تیرہ/u, 13],
  [/چودہ/u, 14],
  [/پندرہ/u, 15],
  [/سولہ/u, 16],
  [/سترہ/u, 17],
  [/اٹھارہ|اٹهارہ|اٹھارا|اس ورش|اس برس/u, 18],
  [/انیس/u, 19],
  [/بیس/u, 20],
  [/اکیس/u, 21],
  [/بائیس/u, 22],
  [/تیئس/u, 23],
  [/چوبیس/u, 24],
  [/پچیس/u, 25],
  [/چھبیس/u, 26],
  [/ستائیس/u, 27],
  [/اٹھائیس/u, 28],
  [/انتیس/u, 29],
  [/تیس/u, 30],
  [/چالیس/u, 40],
  [/پچاس/u, 50],
  [/ساٹھ/u, 60],
  [/ستر/u, 70],
  [/اسی/u, 80],
  [/نوے/u, 90],
  [/سو/u, 100],
];

function normalizeProfileAnswer(answer: string): string {
  return answer
    .toLowerCase()
    .normalize('NFC')
    .replace(/[०-९]/g, (digit) => String('०१२३४५६७८९'.indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/[।,.;:!?'"()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function localProfileAnswer(field: ProfileField, answer: string): string | number | null {
  const text = normalizeProfileAnswer(answer);
  if (field === 'name') {
    const cleaned = answer
      .replace(/^(my name is|i am|i'm|mera naam|मेरा नाम|main|mein|मैं)\s+/i, '')
      .replace(/\s+(hai|है)$/i, '')
      .replace(/["'.]/g, '')
      .trim();
    return cleaned.length > 1 && cleaned.length <= 80 ? cleaned : null;
  }
  if (field === 'age') {
    const match = text.match(/\d{1,3}/);
    if (match) {
      const age = Number(match[0]);
      if (age >= 10 && age <= 100) return age;
    }
    for (const [pattern, age] of HINDI_AGE_WORDS) {
      if (age >= 10 && pattern.test(text)) return age;
    }
    for (const [pattern, age] of URDU_AGE_WORDS) {
      if (age >= 10 && pattern.test(text)) return age;
    }
    return null;
  }
  if (field === 'gender') {
    if (/\b(female|woman|girl|lady|mahila|ladki)\b|महिला|औरत|लड़की|स्त्री/u.test(text)) return 'female';
    if (/\b(male|man|boy|aadmi|ladka|purush)\b|पुरुष|आदमी|लड़का/u.test(text)) return 'male';
    if (/\b(other|transgender|non binary|non-binary)\b|अन्य|ट्रांसजेंडर/u.test(text)) return 'other';
    return null;
  }
  if (field === 'experienceYears') {
    if (/\b(no experience|none|fresher|new|naya|nayi|abhi shuru|just started)\b|कोई नहीं|नया|नई|अभी शुरू/u.test(text)) return 0;
    const match = text.match(/\d{1,2}/);
    if (match) {
      const years = Number(match[0]);
      if (years >= 0 && years <= 70) return years;
    }
    for (const [pattern, years] of [...HINDI_AGE_WORDS, ...URDU_AGE_WORDS]) {
      if (years <= 70 && pattern.test(text)) return years;
    }
    return null;
  }
  if (field === 'workPreference') {
    if (/\b(home|ghar|apne ghar|yahin|yaha|nearby|paas|pass|local|same place)\b|घर|यहीं|यहाँ|पास/u.test(text)) return 'home';
    if (/\b(other|another|different|bahar|dusri|doosri|kahin aur|shehar|city)\b|बाहर|दूसरी|कहीं और|शहर/u.test(text)) return 'other';
    return null;
  }
  if (/\b(postgrad|post graduate|post graduation|masters?|m\.?a|m\.?com|m\.?sc|pg)\b|स्नातकोत्तर|मास्टर/u.test(text)) return 'postgrad';
  if (/\b(undergrad|graduate|graduation|degree|bachelor|b\.?a|b\.?com|b\.?sc|ba|bcom|bsc)\b|स्नातक|ग्रेजुएट|बीए|बी कॉम|बीएससी/u.test(text)) return 'undergrad';
  if (/\b(iti|diploma|polytechnic)\b|आईटीआई|डिप्लोमा/u.test(text)) return 'iti_diploma';
  if (/\b(12th|xii|twelfth|intermediate|senior secondary|barahvi|baarahvi|barvi)\b|बारहवीं|१२वीं|12वीं|12 वीं/u.test(text)) return '12th';
  if (/\b(10th|xth|tenth|matric|secondary|dasvi|dasveen|daswin)\b|दसवीं|१०वीं|10वीं|10 वीं/u.test(text)) return '10th';
  if (/\b(1st|2nd|3rd|4th|5th|6th|7th|8th|9th|primary|middle|below tenth|below 10th|ninth|eighth|seventh|sixth|fifth)\b|पहली|दूसरी|तीसरी|चौथी|पांचवीं|छठी|सातवीं|आठवीं|नौवीं/u.test(text)) return 'below_10th';
  if (/\b(no school|not studied|illiterate|literate|none|nahi padha|nahi padhi)\b|नहीं पढ़ा|नहीं पढ़ी|अनपढ़/u.test(text)) return 'below_10th';
  return null;
}

/**
 * Voice onboarding — turns a free-text answer (spoken or typed, any
 * language) into a structured gender/age/education value via an LLM.
 * `value: null` means the answer couldn't be classified; re-ask, don't guess.
 */
export async function extractProfileAnswer(
  field: ProfileField,
  answer: string,
  language: LanguageCode,
): Promise<{ value: string | number | null }> {
  try {
    const res = await fetch(`${API_BASE}/api/assistant/extract-profile-answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ field, answer, language }),
    });
    if (!res.ok) return { value: localProfileAnswer(field, answer) };
    const result = (await res.json()) as { value: string | number | null };
    return result.value === null ? { value: localProfileAnswer(field, answer) } : result;
  } catch {
    return { value: localProfileAnswer(field, answer) };
  }
}

export interface TtsResult {
  audioUrl: string;
  format: 'wav' | 'mp3' | 'text';
  provider: string;
}

/** Sarvam text-to-speech via the backend. `format: 'text'` means no provider
 *  is configured and the caller should speak the text on-device instead. */
export async function synthesizeSpeech(text: string, language: LanguageCode): Promise<TtsResult> {
  const res = await fetch(`${API_BASE}/api/assistant/tts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: text.slice(0, 1500), language }),
  });
  if (!res.ok) throw new Error(await extractError(res, 'Could not generate speech'));
  return res.json();
}

interface LocalSkill {
  normalizedSkill: string;
  qpCode: string;
  title: string;
  sector: string;
  nsqfLevel: number;
  patterns: string[];
}

const LOCAL_SKILLS: LocalSkill[] = [
  {
    normalizedSkill: 'tailoring',
    qpCode: 'AMH/Q1947',
    title: 'Self Employed Tailor',
    sector: 'Apparel',
    nsqfLevel: 4,
    patterns: [
      'tailor',
      'tailoring',
      'stitching',
      'sewing',
      'silai',
      'सिलाई',
      'दर्जी',
      'தையல்',
      'সেলাই',
      'سلائی',
      'درزی',
      'میں سلائی کرتی',
      'میں سلائی کرتا',
      'سلائی کرتی',
      'سلائی کرتا',
    ],
  },
  {
    normalizedSkill: 'pottery',
    qpCode: 'HCS/Q3001',
    title: 'Terracotta Product Maker',
    sector: 'Handicrafts',
    nsqfLevel: 3,
    patterns: ['pottery', 'clay', 'matka', 'mitti', 'मिट्टी', 'मटका', 'களிமண்', 'মাটির'],
  },
  {
    normalizedSkill: 'masonry',
    qpCode: 'CON/Q0103',
    title: 'Mason General',
    sector: 'Construction',
    nsqfLevel: 4,
    patterns: ['mason', 'masonry', 'construction', 'plaster', 'brick', 'mistri', 'मिस्त्री', 'plaster'],
  },
  {
    normalizedSkill: 'dairy-livestock',
    qpCode: 'AGR/Q4101',
    title: 'Dairy Farmer',
    sector: 'Agriculture',
    nsqfLevel: 3,
    patterns: ['dairy', 'milk', 'cattle', 'livestock', 'doodh', 'दूध', 'गाय', 'ভैंस', 'பால்'],
  },
  {
    normalizedSkill: 'teaching',
    qpCode: 'QG-04-TH-00574-2023-V1-DWSSC',
    title: 'Play School Facilitator cum Caregiver',
    sector: 'Home Management and Caregiving',
    nsqfLevel: 4,
    patterns: [
      'teacher',
      'teaching',
      'teach',
      'tutor',
      'tuition',
      'school teacher',
      'play school',
      'children ko padhana',
      'bachchon ko padhana',
      'adhyapak',
      'shikshak',
      'padhana',
      'टीचर',
      'शिक्षक',
      'अध्यापक',
      'पढ़ाना',
      'पढ़ाती',
      'पढ़ाता',
      'पढ़ाते',
      'बच्चों को पढ़ाना',
      'बच्चों को पढ़ाती',
      'बच्चों को पढ़ाता',
      'बच्चों को पढ़ाते',
      'पढ़ाना',
      'पढ़ाती',
      'पढ़ाता',
      'पढ़ाते',
      'बच्चों को पढ़ाती',
      'बच्चों को पढ़ाता',
    ],
  },
  {
    normalizedSkill: 'ac-repair',
    qpCode: 'ELE/Q3102',
    title: 'Field Technician - Air Conditioner',
    sector: 'Electronics',
    nsqfLevel: 4,
    patterns: ['ac repair', 'ac mechanic', 'air conditioner', 'air conditioning', 'conditioner repair', 'एसी रिपेयर'],
  },
  {
    normalizedSkill: 'accounting',
    qpCode: 'BSC/Q8101',
    title: 'Accounts Executive',
    sector: 'BFSI',
    nsqfLevel: 4,
    patterns: ['accounting', 'accounts', 'accountant', 'book keeping', 'bookkeeping', 'tally', 'gst filing', 'अकाउंटिंग', 'अकाउंटेंट'],
  },
  {
    normalizedSkill: 'clerk-office-assistant',
    qpCode: 'MEP/Q0201',
    title: 'Office Assistant',
    sector: 'Management & Entrepreneurship and Professional Skills',
    nsqfLevel: 4,
    patterns: [
      'clerk',
      'office clerk',
      'office assistant',
      'clerical work',
      'office work',
      'file work',
      'record keeping',
      'admin assistant',
      'क्लर्क',
      'ऑफिस असिस्टेंट',
      'दफ्तर का काम',
      'फाइल का काम',
    ],
  },
  {
    normalizedSkill: 'video-editing',
    qpCode: 'MESC/Q0701',
    title: 'Web Video Production and Editing',
    sector: 'Media & Entertainment',
    nsqfLevel: 4,
    patterns: ['video editing', 'video edit', 'make videos', 'making videos', 'video banana', 'content creator', 'वीडियो एडिटिंग'],
  },
  {
    normalizedSkill: 'medical-care',
    qpCode: 'QG-03-HE-01989-2024-V2-HSSC',
    title: 'Frontline Health Caregiving Assistant',
    sector: 'Healthcare',
    nsqfLevel: 3,
    patterns: [
      'doctor',
      'medical doctor',
      'clinic',
      'clinical work',
      'medical practice',
      'patient treatment',
      'treat patients',
      'healthcare worker',
      'hospital work',
      'डॉक्टर',
      'चिकित्सक',
    ],
  },
];

const LOCAL_AGENT_COPY: Record<LanguageCode, { found: string; unknown: string; rationale: string }> = {
  en: {
    found: 'I understood your skill as {skill}. You can explore matching training programmes and certification options.',
    unknown: 'I heard you, but I could not confidently match one exact skill. Please describe the work you do in a little more detail.',
    rationale: 'Matched on device because the server could not confidently classify this transcript.',
  },
  hi: {
    found: 'मैंने आपका हुनर {skill} समझा। आप इससे जुड़े प्रशिक्षण और प्रमाणन विकल्प देख सकते हैं।',
    unknown: 'मैंने आपकी बात सुनी, लेकिन सही हुनर स्पष्ट नहीं हुआ। कृपया अपना काम थोड़ा और विस्तार से बताइए।',
    rationale: 'अभी backend server नहीं चल रहा, इसलिए यह स्थानीय सुझाव है।',
  },
  bn: {
    found: 'আমি আপনার দক্ষতা {skill} হিসেবে বুঝেছি। আপনি সম্পর্কিত প্রশিক্ষণ ও সার্টিফিকেট বিকল্প দেখতে পারেন।',
    unknown: 'আমি আপনার কথা শুনেছি, কিন্তু সঠিক দক্ষতা স্পষ্ট নয়। আপনার কাজ একটু বিস্তারিত বলুন।',
    rationale: 'backend server এখন চলছে না, তাই এটি স্থানীয় সুপারিশ।',
  },
  ta: {
    found: 'உங்கள் திறனை {skill} என்று புரிந்துகொண்டேன். அதற்கு பொருந்தும் பயிற்சி மற்றும் சான்றிதழ் வாய்ப்புகளை பார்க்கலாம்.',
    unknown: 'நான் கேட்டேன், ஆனால் சரியான திறனை தெளிவாக பொருத்த முடியவில்லை. உங்கள் வேலையை மேலும் விளக்கவும்.',
    rationale: 'backend server இப்போது இயங்கவில்லை, அதனால் இது உள்ளூர் பரிந்துரை.',
  },
  te: {
    found: 'మీ నైపుణ్యాన్ని {skill}గా అర్థం చేసుకున్నాను. దీనికి సరిపోయే శిక్షణ మరియు సర్టిఫికేట్ అవకాశాలను చూడవచ్చు.',
    unknown: 'మీ మాట విన్నాను, కానీ సరైన నైపుణ్యాన్ని స్పష్టంగా గుర్తించలేకపోయాను. మీ పని గురించి ఇంకా వివరంగా చెప్పండి.',
    rationale: 'backend server ఇప్పుడు నడవడం లేదు, కాబట్టి ఇది స్థానిక సూచన.',
  },
  mr: {
    found: 'तुमचे कौशल्य {skill} असे समजले. यासाठी जुळणारे प्रशिक्षण आणि प्रमाणपत्र पर्याय पाहू शकता.',
    unknown: 'तुमची गोष्ट ऐकली, पण नेमके कौशल्य स्पष्ट जुळले नाही. तुमचे काम थोडे अधिक तपशीलात सांगा.',
    rationale: 'backend server सध्या चालू नाही, म्हणून ही स्थानिक सूचना आहे.',
  },
  kn: {
    found: 'ನಿಮ್ಮ ಕೌಶಲ್ಯವನ್ನು {skill} ಎಂದು ಅರ್ಥಮಾಡಿಕೊಂಡೆ. ಇದಕ್ಕೆ ಹೊಂದುವ ತರಬೇತಿ ಮತ್ತು ಪ್ರಮಾಣಪತ್ರ ಆಯ್ಕೆಗಳನ್ನು ನೋಡಬಹುದು.',
    unknown: 'ನಿಮ್ಮ ಮಾತು ಕೇಳಿದೆ, ಆದರೆ ಸರಿಯಾದ ಕೌಶಲ್ಯ ಸ್ಪಷ್ಟವಾಗಿ ಹೊಂದಲಿಲ್ಲ. ನಿಮ್ಮ ಕೆಲಸವನ್ನು ಇನ್ನಷ್ಟು ವಿವರಿಸಿ.',
    rationale: 'backend server ಈಗ ಚಾಲನೆಯಲ್ಲಿಲ್ಲ, ಆದ್ದರಿಂದ ಇದು ಸ್ಥಳೀಯ ಶಿಫಾರಸು.',
  },
  gu: {
    found: 'તમારું કૌશલ્ય {skill} તરીકે સમજાયું. તમે સંબંધિત તાલીમ અને પ્રમાણપત્ર વિકલ્પો જોઈ શકો છો.',
    unknown: 'તમારી વાત સાંભળી, પણ ચોક્કસ કૌશલ્ય સ્પષ્ટ રીતે મળ્યું નહીં. તમારું કામ થોડું વધુ સમજાવો.',
    rationale: 'backend server હાલમાં ચાલુ નથી, તેથી આ સ્થાનિક સૂચન છે.',
  },
  pa: {
    found: 'ਤੁਹਾਡਾ ਹੁਨਰ {skill} ਵਜੋਂ ਸਮਝ ਆਇਆ। ਤੁਸੀਂ ਮਿਲਦੇ ਜੁਲਦੇ ਟ੍ਰੇਨਿੰਗ ਅਤੇ ਸਰਟੀਫਿਕੇਟ ਵਿਕਲਪ ਵੇਖ ਸਕਦੇ ਹੋ।',
    unknown: 'ਤੁਹਾਡੀ ਗੱਲ ਸੁਣੀ, ਪਰ ਸਹੀ ਹੁਨਰ ਸਪਸ਼ਟ ਨਹੀਂ ਮਿਲਿਆ। ਆਪਣਾ ਕੰਮ ਥੋੜ੍ਹਾ ਹੋਰ ਦੱਸੋ.',
    rationale: 'backend server ਇਸ ਵੇਲੇ ਨਹੀਂ ਚੱਲ ਰਿਹਾ, ਇਸ ਲਈ ਇਹ ਸਥਾਨਕ ਸੁਝਾਅ ਹੈ.',
  },
  or: {
    found: 'ଆପଣଙ୍କ କୌଶଳକୁ {skill} ବୋଲି ବୁଝିଲି। ଏହା ସହିତ ମେଳ ଥିବା ପ୍ରଶିକ୍ଷଣ ଓ ସର୍ଟିଫିକେଟ ବିକଳ୍ପ ଦେଖିପାରିବେ।',
    unknown: 'ଆପଣଙ୍କ କଥା ଶୁଣିଲି, କିନ୍ତୁ ଠିକ୍ କୌଶଳ ସ୍ପଷ୍ଟ ହେଲା ନାହିଁ। ଆପଣଙ୍କ କାମକୁ ଅଧିକ ବିସ୍ତାରରେ କହନ୍ତୁ।',
    rationale: 'backend server ବର୍ତ୍ତମାନ ଚାଲୁ ନାହିଁ, ତେଣୁ ଏହା ଏକ ସ୍ଥାନୀୟ ସୁପାରିଶ।',
  },
};

function localConverse(
  transcript: string,
  language: LanguageCode,
  state?: string,
  district?: string,
  history: ConversationMessage[] = [],
): ConverseResponse {
  const historyText = history
    .filter((message) => message.role === 'user')
    .map((message) => message.text)
    .join(' ');
  const text = `${historyText} ${transcript}`.toLowerCase();
  const matches = LOCAL_SKILLS.filter((skill) =>
    skill.patterns.some((pattern) => text.includes(pattern.toLowerCase())),
  );
  const selected = matches.length > 0 ? matches : [];
  const copy = LOCAL_AGENT_COPY[language] ?? LOCAL_AGENT_COPY.en;
  const skillText = selected.map((skill) => skill.title).join(', ');
  const replyText = skillText ? copy.found.replace('{skill}', skillText) : copy.unknown;

  return {
    sessionId: `local-${Date.now()}`,
    transcript,
    stt: { provider: 'sarvam', confidence: 0.8 },
    mappings: selected.length
      ? selected.map((skill) => ({
          rawSkillText: transcript,
          normalizedSkill: skill.normalizedSkill,
          nsqfQualificationId: null,
          qpCode: skill.qpCode,
          title: skill.title,
          sector: skill.sector,
          nsqfLevel: skill.nsqfLevel,
          confidence: 0.75,
          method: 'local',
          pmajayVerified: false,
          pmajayCourse: null,
          nsqfExpired: false,
          proposedOccupations: [],
        }))
      : [
          {
            rawSkillText: transcript,
            normalizedSkill: 'unknown',
            nsqfQualificationId: null,
            qpCode: null,
            title: null,
            sector: null,
            nsqfLevel: null,
            confidence: 0,
            method: 'local',
            pmajayVerified: false,
            pmajayCourse: null,
          },
        ],
    recommendations: selected.slice(0, 3).map((skill, index) => ({
      pmajayCourseId: `local-${skill.normalizedSkill}`,
      subCourseCode: skill.qpCode,
      subCourseName: skill.title,
      courseName: skill.sector,
      sector: skill.sector,
      subSector: skill.sector,
      courseLevel: 'National',
      nsqfQpCode: skill.qpCode,
      nsqfTitle: skill.title,
      nsqfLevel: skill.nsqfLevel,
      score: 0.72 - index * 0.04,
      rationale: copy.rationale,
    })),
    reply: { text: replyText, audioUrl: `data:text/plain;charset=utf-8,${encodeURIComponent(replyText)}`, format: 'text' },
  };
}

export async function setRecommendationStatus(id: string, status: string): Promise<void> {
  await fetch(`${API_BASE}/api/assistant/recommendations/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
}

export type Gender = 'male' | 'female' | 'other';
export type Education = 'below_10th' | '10th' | '12th' | 'iti_diploma' | 'undergrad' | 'postgrad';

export interface AuthUser {
  id: string;
  name: string | null;
  phone: string | null;
  role: 'BENEFICIARY' | 'ADMIN';
  language: LanguageCode;
  gender?: Gender | null;
  age?: number | null;
  education?: Education | null;
  experienceYears?: number | null;
  workPreference?: 'home' | 'other' | null;
  preferredLocation?: string | null;
  state?: string | null;
  district?: string | null;
  onboarded?: boolean;
  avatarUrl?: string | null;
}

interface AuthResponse {
  token: string;
  user: AuthUser;
}

export async function login(phone: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, password }),
  });
  if (!res.ok) throw new Error(await extractError(res, 'Invalid phone or password'));
  return res.json();
}

/** Ask the server to text a verification code to a phone that is signing up.
 *  In mock mode (no SMS provider) the response carries `devOtp` so the flow
 *  is testable without a real handset. */
export async function requestSignupOtp(phone: string): Promise<{ sent: boolean; provider: string; devOtp?: string }> {
  const res = await fetch(`${API_BASE}/api/auth/signup-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone }),
  });
  if (!res.ok) throw new Error(await extractError(res, 'Could not send the code'));
  return res.json();
}

export async function register(input: {
  phone: string;
  password: string;
  name?: string;
  language: LanguageCode;
  /** code from requestSignupOtp — the server rejects registration without it */
  otp: string;
}): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...input, role: 'BENEFICIARY' }),
  });
  if (!res.ok) throw new Error(await extractError(res, 'Could not create account'));
  return res.json();
}

export interface ForgotPasswordResponse {
  sent: boolean;
  provider: 'mock' | 'sms';
  /** only present when no SMS provider is configured server-side */
  devOtp?: string;
}

export async function forgotPassword(phone: string): Promise<ForgotPasswordResponse> {
  const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone }),
  });
  if (!res.ok) throw new Error(await extractError(res, 'No account found with this phone number'));
  return res.json();
}

export async function resetPassword(phone: string, otp: string, newPassword: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, otp, newPassword }),
  });
  if (!res.ok) throw new Error(await extractError(res, 'Incorrect code'));
  return res.json();
}

export async function updateProfile(
  token: string,
  input: {
    name?: string;
    gender?: Gender;
    age?: number;
    education?: Education;
    experienceYears?: number;
    workPreference?: 'home' | 'other';
    preferredLocation?: string;
    state?: string;
    district?: string;
    onboarded?: boolean;
    avatarUrl?: string | null;
  },
): Promise<{ user: AuthUser }> {
  const res = await fetch(`${API_BASE}/api/auth/profile`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await extractError(res, 'Could not save your answer'));
  return res.json();
}

async function extractError(res: Response, fallback: string): Promise<string> {
  const body = await res.json().catch(() => null);
  const e = body?.error;
  return typeof e === 'string' ? e : fallback;
}

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health`);
    return res.ok;
  } catch {
    return false;
  }
}
