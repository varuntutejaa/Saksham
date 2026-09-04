import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Resolve the backend base URL.
 *  - Set EXPO_PUBLIC_API_URL for a deployed server (recommended for demos on real devices).
 *  - Otherwise we derive the LAN host from the Expo dev server so a phone on the
 *    same Wi-Fi can reach the API running on your laptop.
 */
function resolveBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');

  const hostUri =
    Constants.expoConfig?.hostUri ??
    (Constants as { manifest2?: { extra?: { expoClient?: { hostUri?: string } } } }).manifest2
      ?.extra?.expoClient?.hostUri;
  const host = hostUri?.split(':')[0];
  if (host && Platform.OS !== 'web') return `http://${host}:4000`;

  return 'http://localhost:4000';
}

export const API_BASE = resolveBaseUrl();

export type LanguageCode =
  | 'hi' | 'en' | 'bn' | 'ta' | 'te' | 'mr' | 'kn' | 'gu' | 'pa' | 'or';

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
  const res = await fetch(`${API_BASE}/api/programs${qs.toString() ? `?${qs}` : ''}`);
  if (!res.ok) throw new Error(`programs ${res.status}`);
  return res.json();
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
      type: 'audio/m4a',
    } as unknown as Blob);
  }

  try {
    const res = await fetch(`${API_BASE}/api/assistant/converse`, {
      method: 'POST',
      body: form,
    });
    if (!res.ok) throw new Error(`Assistant error ${res.status}: ${await res.text()}`);
    return res.json();
  } catch {
    if (!input.transcript) throw new Error('Assistant server is unavailable');
    return localConverse(input.transcript, input.language, input.state, input.district, input.history);
  }
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
    patterns: ['tailor', 'tailoring', 'stitching', 'sewing', 'silai', 'सिलाई', 'दर्जी', 'தையல்', 'সেলাই'],
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
];

const LOCAL_AGENT_COPY: Record<LanguageCode, { found: string; unknown: string; rationale: string }> = {
  en: {
    found: 'I understood your skill as {skill}. You can explore matching training programmes and certification options.',
    unknown: 'I heard you, but I could not confidently match one exact skill. Please describe the work you do in a little more detail.',
    rationale: 'Suggested locally because the backend server is not running right now.',
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
          },
        ],
    recommendations: selected.slice(0, 3).map((skill, index) => ({
      trainingProgramId: `local-${skill.normalizedSkill}`,
      name: `${skill.title} Training`,
      nameHindi: null,
      scheme: 'PM-AJAY',
      component: 'Skill Development',
      sector: skill.sector,
      nsqfLevel: skill.nsqfLevel,
      mode: 'OFFLINE',
      durationWeeks: 8 + index * 2,
      stipend: true,
      district: district ?? null,
      state: state ?? null,
      contactPhone: null,
      seatsAvailable: null,
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

export async function register(input: {
  phone: string;
  password: string;
  name?: string;
  language: LanguageCode;
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
    gender?: Gender;
    age?: number;
    education?: Education;
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
