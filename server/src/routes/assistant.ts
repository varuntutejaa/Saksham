import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { transcribeAudio, synthesizeSpeech } from "../services/speech.js";
import { mapTranscriptToNsqf } from "../services/nsqf.js";
import { recommendPrograms } from "../services/recommend.js";

export const assistantRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

const LANGS = ["hi", "en", "bn", "ta", "te", "mr", "kn", "gu", "pa", "or"] as const;

type ConversationMessage = {
  role: "user" | "assistant";
  text: string;
};

function parseHistory(raw: unknown): ConversationMessage[] {
  if (typeof raw !== "string" || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (message): message is ConversationMessage =>
          message &&
          (message.role === "user" || message.role === "assistant") &&
          typeof message.text === "string" &&
          message.text.trim().length > 0,
      )
      .slice(-8);
  } catch {
    return [];
  }
}

/**
 * POST /api/assistant/converse
 * The full voice-first pipeline in one round trip (keeps requests low on a weak
 * connection). Accepts EITHER an uploaded `audio` file OR a `transcript` string.
 *
 * multipart fields: audio (file), language, state, district, userId, bandwidthKbps
 * OR json body: { transcript, language, state, district, userId, bandwidthKbps }
 */
assistantRouter.post("/converse", upload.single("audio"), async (req, res) => {
  const schema = z.object({
    transcript: z.string().min(2).optional(),
    language: z.enum(LANGS).default("hi"),
    state: z.string().optional(),
    district: z.string().optional(),
    userId: z.string().optional(),
    channel: z.enum(["APP", "WEB", "IVR"]).default("APP"),
    bandwidthKbps: z.coerce.number().int().positive().optional(),
    history: z.string().optional(),
    autoDetectLanguage: z.coerce.boolean().default(true),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { language, state, district, userId, channel, bandwidthKbps, autoDetectLanguage } = parsed.data;
  const history = parseHistory(parsed.data.history);
  let effectiveLanguage = language;

  // 1. Speech -> text
  let transcript = parsed.data.transcript;
  let sttProvider: string | undefined;
  let sttConfidence: number | undefined;
  if (!transcript) {
    const stt = await transcribeAudio(req.file?.buffer, language, {
      autoDetect: autoDetectLanguage,
      mimeType: req.file?.mimetype,
      fileName: req.file?.originalname,
    });
    transcript = stt.transcript;
    effectiveLanguage = stt.language;
    sttProvider = stt.provider;
    sttConfidence = stt.confidence;
  }

  // 2. Text -> NSQF qualifications
  const recentUserContext = history
    .filter((message) => message.role === "user")
    .map((message) => message.text)
    .join(" ");
  const mappingTranscript = [recentUserContext, transcript].filter(Boolean).join(" ");
  const mappings = await mapTranscriptToNsqf(mappingTranscript);

  // 3. NSQF + location -> PM-AJAY programmes
  const recommendations = await recommendPrograms({ mappings, state, district, language: effectiveLanguage });

  // 4. Persist the session for the admin dashboard
  const session = await prisma.voiceSession.create({
    data: {
      userId: userId || null,
      channel,
      language: effectiveLanguage,
      rawTranscript: transcript,
      detectedSkills: mappings.map((m) => m.normalizedSkill).filter((s) => s !== "unknown"),
      bandwidthKbps: bandwidthKbps ?? null,
      state: state ?? null,
      district: district ?? null,
      mappings: {
        create: mappings
          .filter((m) => m.normalizedSkill !== "unknown")
          .map((m) => ({
            rawSkillText: m.rawSkillText,
            normalizedSkill: m.normalizedSkill,
            nsqfQualificationId: m.nsqfQualificationId,
            confidence: m.confidence,
            method: m.method,
          })),
      },
      recommendations: {
        create: recommendations.map((r) => ({
          userId: userId || null,
          trainingProgramId: r.trainingProgramId,
          score: r.score,
          rationale: r.rationale,
        })),
      },
    },
    include: { recommendations: true },
  });

  // 5. Build the spoken reply
  const spokenText = buildSpokenReply(effectiveLanguage, mappings, recommendations);
  const audio = await synthesizeSpeech(spokenText, effectiveLanguage);

  res.json({
    sessionId: session.id,
    transcript,
    language: effectiveLanguage,
    stt: sttProvider ? { provider: sttProvider, confidence: sttConfidence, language: effectiveLanguage } : undefined,
    mappings,
    recommendations: recommendations.map((r, i) => ({
      ...r,
      recommendationId: session.recommendations[i]?.id,
    })),
    reply: { text: spokenText, audioUrl: audio.audioUrl, format: audio.format },
  });
});

/**
 * POST /api/assistant/transcribe
 * Transcribes one uploaded recording. The mobile app uses this so the Sarvam
 * secret can live on the server instead of being baked into the Expo bundle.
 */
assistantRouter.post("/transcribe", upload.single("audio"), async (req, res) => {
  const schema = z.object({
    language: z.enum(LANGS).default("hi"),
    autoDetectLanguage: z.coerce.boolean().default(true),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  if (!req.file?.buffer) return res.status(400).json({ error: "Audio file is required" });

  const stt = await transcribeAudio(req.file.buffer, parsed.data.language, {
    autoDetect: parsed.data.autoDetectLanguage,
    mimeType: req.file?.mimetype,
    fileName: req.file?.originalname,
  });

  res.json({
    transcript: stt.transcript,
    language: stt.language,
    languageCode: stt.language,
    languageProbability: stt.confidence,
    stt: { provider: stt.provider, confidence: stt.confidence, language: stt.language },
  });
});

/** PATCH /api/assistant/recommendations/:id  { status } — track funnel */
assistantRouter.patch("/recommendations/:id", async (req, res) => {
  const schema = z.object({
    status: z.enum(["SUGGESTED", "VIEWED", "INTERESTED", "APPLIED", "ENROLLED", "REJECTED"]),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  try {
    const updated = await prisma.recommendation.update({
      where: { id: req.params.id },
      data: { status: parsed.data.status },
    });
    res.json(updated);
  } catch {
    res.status(404).json({ error: "Recommendation not found" });
  }
});

function buildSpokenReply(
  lang: string,
  mappings: { title: string | null; nsqfLevel: number | null }[],
  recs: { name: string; nameHindi: string | null; rationale: string }[],
): string {
  const known = mappings.filter((m) => m.title);
  const skillList = known.map((m) => m.title).join(", ");
  const nsqfLevel = known[0]?.nsqfLevel ?? "";
  const copy: Record<string, { found: string; unknown: string; lead: string; programName: (r: { name: string; nameHindi: string | null }) => string }> = {
    en: {
      found: `Your skill matches ${skillList} (NSQF level ${nsqfLevel}).`,
      unknown: "I could not fully understand your skill, please say it again.",
      lead: " Recommended training for you: ",
      programName: (r) => r.name,
    },
    hi: {
      found: `आपका हुनर ${skillList} (NSQF स्तर ${nsqfLevel}) से मेल खाता है।`,
      unknown: "मुझे आपका हुनर पूरी तरह समझ नहीं आया, कृपया दोबारा बताइए।",
      lead: " आपके लिए सुझाए गए प्रशिक्षण: ",
      programName: (r) => r.nameHindi ?? r.name,
    },
    bn: {
      found: `আপনার দক্ষতা ${skillList} (NSQF স্তর ${nsqfLevel})-এর সঙ্গে মেলে।`,
      unknown: "আমি আপনার দক্ষতা পুরোপুরি বুঝতে পারিনি, অনুগ্রহ করে আবার বলুন।",
      lead: " আপনার জন্য প্রস্তাবিত প্রশিক্ষণ: ",
      programName: (r) => r.nameHindi ?? r.name,
    },
    ta: {
      found: `உங்கள் திறன் ${skillList} (NSQF நிலை ${nsqfLevel}) உடன் பொருந்துகிறது.`,
      unknown: "உங்கள் திறனை முழுமையாக புரிந்துகொள்ள முடியவில்லை, தயவுசெய்து மீண்டும் சொல்லுங்கள்.",
      lead: " உங்களுக்கான பரிந்துரைக்கப்பட்ட பயிற்சி: ",
      programName: (r) => r.nameHindi ?? r.name,
    },
    te: {
      found: `మీ నైపుణ్యం ${skillList} (NSQF స్థాయి ${nsqfLevel})తో సరిపోతుంది.`,
      unknown: "మీ నైపుణ్యాన్ని పూర్తిగా అర్థం చేసుకోలేకపోయాను, దయచేసి మళ్లీ చెప్పండి.",
      lead: " మీ కోసం సూచించిన శిక్షణ: ",
      programName: (r) => r.nameHindi ?? r.name,
    },
    mr: {
      found: `तुमचे कौशल्य ${skillList} (NSQF स्तर ${nsqfLevel}) शी जुळते.`,
      unknown: "तुमचे कौशल्य पूर्णपणे समजले नाही, कृपया पुन्हा सांगा.",
      lead: " तुमच्यासाठी सुचवलेले प्रशिक्षण: ",
      programName: (r) => r.nameHindi ?? r.name,
    },
    kn: {
      found: `ನಿಮ್ಮ ಕೌಶಲ್ಯ ${skillList} (NSQF ಮಟ್ಟ ${nsqfLevel})ಕ್ಕೆ ಹೊಂದುತ್ತದೆ.`,
      unknown: "ನಿಮ್ಮ ಕೌಶಲ್ಯವನ್ನು ಸಂಪೂರ್ಣವಾಗಿ ಅರ್ಥಮಾಡಿಕೊಳ್ಳಲಾಗಲಿಲ್ಲ, ದಯವಿಟ್ಟು ಮತ್ತೆ ಹೇಳಿ.",
      lead: " ನಿಮಗಾಗಿ ಶಿಫಾರಸು ಮಾಡಿದ ತರಬೇತಿ: ",
      programName: (r) => r.nameHindi ?? r.name,
    },
    gu: {
      found: `તમારું કૌશલ્ય ${skillList} (NSQF સ્તર ${nsqfLevel}) સાથે મેળ ખાતું છે.`,
      unknown: "તમારું કૌશલ્ય સંપૂર્ણ રીતે સમજાયું નથી, કૃપા કરીને ફરી કહો.",
      lead: " તમારા માટે ભલામણ કરેલ તાલીમ: ",
      programName: (r) => r.nameHindi ?? r.name,
    },
    pa: {
      found: `ਤੁਹਾਡਾ ਹੁਨਰ ${skillList} (NSQF ਪੱਧਰ ${nsqfLevel}) ਨਾਲ ਮਿਲਦਾ ਹੈ।`,
      unknown: "ਮੈਂ ਤੁਹਾਡਾ ਹੁਨਰ ਪੂਰੀ ਤਰ੍ਹਾਂ ਨਹੀਂ ਸਮਝ ਸਕਿਆ, ਕਿਰਪਾ ਕਰਕੇ ਦੁਬਾਰਾ ਦੱਸੋ।",
      lead: " ਤੁਹਾਡੇ ਲਈ ਸੁਝਾਈ ਟ੍ਰੇਨਿੰਗ: ",
      programName: (r) => r.nameHindi ?? r.name,
    },
    or: {
      found: `ଆପଣଙ୍କ କୌଶଳ ${skillList} (NSQF ସ୍ତର ${nsqfLevel}) ସହିତ ମେଳ ଖାଉଛି।`,
      unknown: "ଆପଣଙ୍କ କୌଶଳକୁ ପୂରାପୁରି ବୁଝିପାରିଲି ନାହିଁ, ଦୟାକରି ପୁଣି କହନ୍ତୁ।",
      lead: " ଆପଣଙ୍କ ପାଇଁ ସୁପାରିଶିତ ପ୍ରଶିକ୍ଷଣ: ",
      programName: (r) => r.nameHindi ?? r.name,
    },
  };
  const t = copy[lang] ?? copy.en;
  const base = known.length > 0 ? t.found : t.unknown;
  if (recs.length === 0) return base;
  const list = recs
    .slice(0, 3)
    .map((r, i) => `${i + 1}. ${t.programName(r)} — ${r.rationale}`)
    .join(" ");
  return base + t.lead + list;
}
