import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { transcribeAudio, synthesizeSpeech, TranscriptionUnavailableError } from "../services/speech.js";
import { mapTranscriptToNsqf } from "../services/nsqf.js";
import { recommendCourses } from "../services/recommend.js";
import { matchJobs } from "../services/jobs.js";
import { buildSpokenReply } from "../services/reply.js";
import { answerFromDocuments } from "../services/rag.js";
import { extractProfileAnswer } from "../services/profileExtract.js";

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
    /** What the beneficiary said they want on the confirm screen. Steers
     *  ranking only — the full result set is always returned underneath, so a
     *  wrong guess never hides an opportunity. */
    intent: z.enum(["jobs", "training", "certificate", "guidance"]).default("guidance"),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { language, state, district, userId, channel, bandwidthKbps, autoDetectLanguage, intent } = parsed.data;
  const history = parseHistory(parsed.data.history);
  // The language the beneficiary chose. Never overwritten by STT detection —
  // see the note in the transcription step below.
  const effectiveLanguage = language;

  // 1. Speech -> text
  let transcript = parsed.data.transcript;
  let sttProvider: string | undefined;
  let sttConfidence: number | undefined;
  if (!transcript) {
    let stt;
    try {
      stt = await transcribeAudio(req.file?.buffer, language, {
        autoDetect: autoDetectLanguage,
        mimeType: req.file?.mimetype,
        fileName: req.file?.originalname,
      });
    } catch (err) {
      if (err instanceof TranscriptionUnavailableError) return res.status(503).json({ error: err.message });
      throw err;
    }
    transcript = stt.transcript;
    // Auto-detect helps STT transcribe accurately, but it must NOT change the
    // language we answer in: the beneficiary deliberately chose one, and a
    // person who says an English word or two — or whose dialect is misread —
    // should not suddenly be answered in a language they may not read.
    // stt.language is kept for analytics only.
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

  // 3. NSQF match -> real PM-AJAY courses
  const [recommendations, jobs] = await Promise.all([
    recommendCourses({ mappings, state, language: effectiveLanguage, intent }),
    matchJobs({ mappings, state, district }),
  ]);

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
            pmajayVerified: m.pmajayVerified,
          })),
      },
      recommendations: {
        create: recommendations.map((r) => ({
          userId: userId || null,
          pmajayCourseId: r.pmajayCourseId,
          score: r.score,
          rationale: r.rationale,
        })),
      },
    },
    include: { recommendations: true },
  });

  // 5. Build the spoken reply
  const spokenText = buildSpokenReply(
    effectiveLanguage,
    mappings,
    recommendations.map((r) => ({ name: r.subCourseName, rationale: r.rationale })),
  );
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
    jobs,
    reply: { text: spokenText, audioUrl: audio.audioUrl, format: audio.format },
  });
});

/**
 * POST /api/assistant/reprioritise
 * Re-ranks an existing session's recommendations for the intent the
 * beneficiary picked on the confirm screen ("find work" / "certify what I
 * already do" / ...). Deliberately NOT a second /converse: it reuses the
 * session's stored transcript and creates no new VoiceSession, so the admin
 * funnel still shows one session per spoken utterance.
 *
 * Ranking-only — the same courses come back, reordered. Nothing is filtered
 * out, so picking the "wrong" option can never hide an opportunity.
 */
assistantRouter.post("/reprioritise", async (req, res) => {
  const schema = z.object({
    sessionId: z.string().min(1),
    intent: z.enum(["jobs", "training", "certificate", "guidance"]),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { sessionId, intent } = parsed.data;

  const session = await prisma.voiceSession.findUnique({ where: { id: sessionId } });
  if (!session) return res.status(404).json({ error: "Session not found" });

  // a session recorded with no usable transcript has nothing to re-rank
  if (!session.rawTranscript) return res.json({ sessionId, intent, mappings: [], recommendations: [], jobs: [] });

  const mappings = await mapTranscriptToNsqf(session.rawTranscript);
  const [recommendations, jobs] = await Promise.all([
    recommendCourses({
      mappings,
      state: session.state,
      district: session.district,
      language: session.language,
      intent,
    }),
    matchJobs({ mappings, state: session.state, district: session.district }),
  ]);

  res.json({ sessionId, intent, mappings, recommendations, jobs });
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

  let stt;
  try {
    stt = await transcribeAudio(req.file.buffer, parsed.data.language, {
      autoDetect: parsed.data.autoDetectLanguage,
      mimeType: req.file?.mimetype,
      fileName: req.file?.originalname,
    });
  } catch (err) {
    if (err instanceof TranscriptionUnavailableError) return res.status(503).json({ error: err.message });
    throw err;
  }

  res.json({
    transcript: stt.transcript,
    language: stt.language,
    languageCode: stt.language,
    languageProbability: stt.confidence,
    stt: { provider: stt.provider, confidence: stt.confidence, language: stt.language },
  });
});

/**
 * POST /api/assistant/extract-profile-answer
 * Voice onboarding (app/src/app/onboarding/voice-profile.tsx): turns a free-
 * text answer (spoken or typed, any language) into the structured
 * gender/age/education value the profile needs. `value: null` means the
 * answer couldn't be classified — the app should re-ask, not guess.
 */
const extractProfileSchema = z.object({
  field: z.enum(["name", "gender", "age", "education"]),
  answer: z.string().min(1),
  language: z.enum(LANGS).default("hi"),
});
assistantRouter.post("/extract-profile-answer", async (req, res) => {
  const parsed = extractProfileSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const value = await extractProfileAnswer(parsed.data.field, parsed.data.answer, parsed.data.language);
  res.json({ value });
});

/**
 * POST /api/assistant/tts
 * Sarvam text-to-speech for the app's voice agent and onboarding questions.
 * Returns { audioUrl } as a base64 wav `data:` URI, or a text/plain `data:`
 * URI when no TTS provider is configured — the client then falls back to
 * on-device speech.
 */
const ttsSchema = z.object({
  text: z.string().min(1).max(1500),
  language: z.enum(LANGS).default("hi"),
});
assistantRouter.post("/tts", async (req, res) => {
  const parsed = ttsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const audio = await synthesizeSpeech(parsed.data.text, parsed.data.language);
  res.json(audio);
});

/**
 * POST /api/assistant/ask
 * RAG: answers a free-text policy/FAQ question ("what benefits does PM-AJAY
 * give for beekeeping?", "will I get a certificate?", "how do I apply?")
 * from real government documents (services/rag.ts) — for questions the
 * structured skill-mapping pipeline above can't answer, because the answer
 * lives in prose guidelines, not a database row.
 */
const askSchema = z.object({
  question: z.string().min(3),
  language: z.enum(LANGS).default("hi"),
});
assistantRouter.post("/ask", async (req, res) => {
  const parsed = askSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const result = await answerFromDocuments(parsed.data.question, parsed.data.language);
  res.json(result);
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
