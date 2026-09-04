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
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { language, state, district, userId, channel, bandwidthKbps } = parsed.data;

  // 1. Speech -> text
  let transcript = parsed.data.transcript;
  let sttProvider: string | undefined;
  let sttConfidence: number | undefined;
  if (!transcript) {
    const stt = await transcribeAudio(req.file?.buffer, language);
    transcript = stt.transcript;
    sttProvider = stt.provider;
    sttConfidence = stt.confidence;
  }

  // 2. Text -> NSQF qualifications
  const mappings = await mapTranscriptToNsqf(transcript);

  // 3. NSQF + location -> PM-AJAY programmes
  const recommendations = await recommendPrograms({ mappings, state, district, language });

  // 4. Persist the session for the admin dashboard
  const session = await prisma.voiceSession.create({
    data: {
      userId: userId || null,
      channel,
      language,
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
  const spokenText = buildSpokenReply(language, mappings, recommendations);
  const audio = await synthesizeSpeech(spokenText, language);

  res.json({
    sessionId: session.id,
    transcript,
    stt: sttProvider ? { provider: sttProvider, confidence: sttConfidence } : undefined,
    mappings,
    recommendations: recommendations.map((r, i) => ({
      ...r,
      recommendationId: session.recommendations[i]?.id,
    })),
    reply: { text: spokenText, audioUrl: audio.audioUrl, format: audio.format },
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
  const intro: Record<string, string> = {
    hi:
      known.length > 0
        ? `आपका हुनर ${known.map((m) => m.title).join(", ")} (NSQF स्तर ${known[0].nsqfLevel}) से मेल खाता है।`
        : "मुझे आपका हुनर पूरी तरह समझ नहीं आया, कृपया दोबारा बताइए।",
    en:
      known.length > 0
        ? `Your skill matches ${known.map((m) => m.title).join(", ")} (NSQF level ${known[0].nsqfLevel}).`
        : "I could not fully understand your skill, please say it again.",
  };
  const base = intro[lang] ?? intro.en;
  if (recs.length === 0) return base;
  const list = recs
    .slice(0, 3)
    .map((r, i) => `${i + 1}. ${lang === "hi" ? r.nameHindi ?? r.name : r.name} — ${r.rationale}`)
    .join(" ");
  const lead = lang === "hi" ? " आपके लिए सुझाए गए प्रशिक्षण: " : " Recommended training for you: ";
  return base + lead + list;
}
