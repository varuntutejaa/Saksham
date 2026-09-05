import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { env, hasTwilio } from "../lib/env.js";
import { transcribeAudio } from "../services/speech.js";
import { mapTranscriptToNsqf } from "../services/nsqf.js";
import { recommendCourses } from "../services/recommend.js";
import { buildSpokenReply } from "../services/reply.js";

export const whatsappRouter = Router();

/**
 * POST /api/whatsapp/webhook — Twilio WhatsApp inbound-message webhook.
 *
 * PLACEHOLDER, wired to the real pipeline: this reuses the same skill
 * lexicon -> NSQF -> recommendation pipeline as /api/assistant/converse, so
 * once a Twilio WhatsApp sender is created and its webhook URL is pointed
 * here, a beneficiary should be able to text or send a voice note and get a
 * real answer back. Left undone for whoever connects Twilio:
 *   - Twilio request signature validation (X-Twilio-Signature) — right now
 *     this endpoint trusts any POST that reaches it.
 *   - A way to pick language / state / district over chat (WhatsApp has no
 *     picker like the app does) — currently defaults to Hindi text with
 *     STT auto-detect for voice notes, and no location filtering.
 *   - Linking a WhatsApp number to an existing Saksham account.
 *
 * Twilio POSTs `application/x-www-form-urlencoded`, at least:
 *   From        "whatsapp:+91XXXXXXXXXX"
 *   Body        the text message, if any
 *   NumMedia    "0" | "1" | ...
 *   MediaUrl0   URL of the first attachment (e.g. a voice note), if any
 *   MediaContentType0  its MIME type (WhatsApp voice notes are audio/ogg)
 */
const twilioWebhookSchema = z.object({
  Body: z.string().optional(),
  NumMedia: z.string().optional(),
  MediaUrl0: z.string().optional(),
  MediaContentType0: z.string().optional(),
});

whatsappRouter.post("/webhook", async (req, res) => {
  const parsed = twilioWebhookSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.type("text/xml").send(twiml("Sorry, that message could not be read."));
  }
  const { Body, NumMedia, MediaUrl0, MediaContentType0 } = parsed.data;
  const language = "hi" as const; // no language picker over WhatsApp yet — see TODO above

  try {
    let transcript = Body?.trim();

    if (!transcript && Number(NumMedia ?? "0") > 0 && MediaUrl0) {
      if (!hasTwilio) {
        return res
          .type("text/xml")
          .send(twiml("Voice notes need the server's Twilio credentials configured first — please type your skill instead."));
      }
      const audio = await fetchTwilioMedia(MediaUrl0);
      const stt = await transcribeAudio(audio, language, { autoDetect: true, mimeType: MediaContentType0 });
      transcript = stt.transcript;
    }

    if (!transcript) {
      return res.type("text/xml").send(twiml("Please send a text message or a voice note describing your skill."));
    }

    const mappings = await mapTranscriptToNsqf(transcript);
    const recommendations = await recommendCourses({ mappings, language });

    await prisma.voiceSession.create({
      data: {
        channel: "WHATSAPP",
        language,
        rawTranscript: transcript,
        detectedSkills: mappings.map((m) => m.normalizedSkill).filter((s) => s !== "unknown"),
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
            pmajayCourseId: r.pmajayCourseId,
            score: r.score,
            rationale: r.rationale,
          })),
        },
      },
    });

    res.type("text/xml").send(twiml(buildSpokenReply(language, mappings, recommendations.map((r) => ({ name: r.subCourseName, rationale: r.rationale })))));
  } catch (err) {
    console.error("[whatsapp] webhook failed:", err);
    res.type("text/xml").send(twiml("Something went wrong on our end — please try again in a moment."));
  }
});

function twiml(message: string): string {
  const escaped = message.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escaped}</Message></Response>`;
}

async function fetchTwilioMedia(url: string): Promise<Buffer> {
  const auth = Buffer.from(`${env.twilioAccountSid}:${env.twilioAuthToken}`).toString("base64");
  const res = await fetch(url, { headers: { Authorization: `Basic ${auth}` } });
  if (!res.ok) throw new Error(`Could not download WhatsApp media: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}
