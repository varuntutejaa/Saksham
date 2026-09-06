import { NextRequest, NextResponse } from "next/server";
import { generateStructured } from "@/lib/gemini";
import { getCatalog, nsqfCatalogAsText, programCatalogAsText } from "@/lib/nsqf-catalog";
import { LANGUAGES, type LanguageCode } from "@/lib/languages";
import { API_BASE, type NsqfMapping } from "@/lib/site-api";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_TRANSCRIPT_LENGTH = 800;

interface HistoryMessage {
  role: "user" | "assistant";
  text: string;
}

interface RequestBody {
  transcript: string;
  language: LanguageCode;
  state?: string;
  district?: string;
  userId?: string;
  history?: HistoryMessage[];
}

interface GeminiResult {
  englishTranscript: string;
  mappings: {
    qpCode: string;
    normalizedSkill: string;
    confidence: number;
  }[];
  recommendedProgramIds: {
    id: string;
    rationale: string;
    score: number;
  }[];
  reply: string;
}

const RESULT_SCHEMA = {
  type: "object",
  properties: {
    englishTranscript: {
      type: "string",
      description: "The user's transcript translated into clean, natural English.",
    },
    mappings: {
      type: "array",
      description:
        "Up to 3 best-matching NSQF qualifications from the catalog, ranked by confidence. Empty if nothing in the catalog is a reasonable match — never invent a qpCode that isn't in the catalog.",
      items: {
        type: "object",
        properties: {
          qpCode: { type: "string", description: "Must be an exact qpCode from the supplied catalog." },
          normalizedSkill: { type: "string", description: "A short English label for the skill, e.g. 'pottery', 'tailoring'." },
          confidence: { type: "number", description: "0 to 1." },
        },
        required: ["qpCode", "normalizedSkill", "confidence"],
      },
    },
    recommendedProgramIds: {
      type: "array",
      description:
        "Up to 5 best-matching training programmes from the supplied programme catalog, considering sector/NSQF-level match first, then the user's state/district if given, then stipend and seat availability. Empty if none of the mapped qualifications have a relevant programme.",
      items: {
        type: "object",
        properties: {
          id: { type: "string", description: "Must be an exact id from the supplied programme catalog." },
          rationale: {
            type: "string",
            description: "One short sentence, in the TARGET language given below, explaining why this programme was suggested.",
          },
          score: { type: "number", description: "0 to 1, relevance score." },
        },
        required: ["id", "rationale", "score"],
      },
    },
    reply: {
      type: "string",
      description:
        "A short, warm spoken-style reply in the TARGET language given below, confirming what skill was understood and what was found. This is read aloud to the user — keep it natural and brief.",
    },
  },
  required: ["englishTranscript", "mappings", "recommendedProgramIds", "reply"],
};

function buildPrompt(input: {
  transcript: string;
  targetLanguage: string;
  history?: HistoryMessage[];
  state?: string;
  district?: string;
  nsqfText: string;
  programsText: string;
}): string {
  const historyBlock = input.history?.length
    ? `\nPrior conversation turns (oldest first):\n${input.history.map((h) => `${h.role}: ${h.text}`).join("\n")}\n`
    : "";
  const locationBlock =
    input.state || input.district ? `\nUser's location: ${[input.district, input.state].filter(Boolean).join(", ")}\n` : "";

  return `You are the skill-understanding engine for Saksham, a voice assistant that helps SC-community beneficiaries in India find PM-AJAY government training. A beneficiary just described their traditional occupation or skill out loud, in their own words — it may be in English, a transliterated Indian language written in Latin script, native script, or a mix (code-switching is normal and expected).

Your job, in order:
1. Translate/normalize what they said into clean English (fix transliteration spelling variance, informal phrasing, etc).
2. Using ONLY that English understanding, semantically match it against the real NSQF qualification catalog below — this is the authoritative, government-sourced list. Match by meaning, not just keyword overlap: e.g. "I fix mobile phones" should match a mobile-repair-related qualification even if the word "repair" isn't in the keywords column, and "mitti ke bartan" (clay pots) should match pottery/terracotta qualifications. If genuinely nothing in the catalog fits, return an empty mappings array — never invent a qpCode.
3. From the matched qualification(s), pick the best real training programmes from the programme catalog below (also authoritative) — prefer matching sector and NSQF level, then the user's state/district if given, then programmes offering a stipend or with seats available. If none fit, return an empty array.
4. Write a short reply and every rationale in ${input.targetLanguage} (NOT English) — the beneficiary only understands their own language, so nothing you show them should be in English unless ${input.targetLanguage} is itself English.
${historyBlock}${locationBlock}
Beneficiary just said: "${input.transcript}"

NSQF qualification catalog (qpCode|title|sector|level|keywords), one per line:
${input.nsqfText}

PM-AJAY programme catalog (id|name|scheme|sector|level|mode|duration|stipend|location|seats), one per line:
${input.programsText}`;
}

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const limit = rateLimit(`understand:${ip}`, 8, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many requests — please wait a moment and try again." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((limit.retryAfterMs ?? 60_000) / 1000)) } },
    );
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body.transcript?.trim() || !body.language) {
    return NextResponse.json({ error: "transcript and language are required" }, { status: 400 });
  }
  if (body.transcript.length > MAX_TRANSCRIPT_LENGTH) {
    body.transcript = body.transcript.slice(0, MAX_TRANSCRIPT_LENGTH);
  }

  const targetLanguage = LANGUAGES.find((l) => l.code === body.language)?.english ?? "Hindi";

  try {
    const { nsqf, programs } = await getCatalog();

    const result = await generateStructured<GeminiResult>(
      buildPrompt({
        transcript: body.transcript,
        targetLanguage,
        history: body.history,
        state: body.state,
        district: body.district,
        nsqfText: nsqfCatalogAsText(nsqf),
        programsText: programCatalogAsText(programs),
      }),
      RESULT_SCHEMA,
    );

    const nsqfByCode = new Map(nsqf.map((n) => [n.qpCode, n]));
    const programById = new Map(programs.map((p) => [p.id, p]));

    const mappings: NsqfMapping[] = result.mappings
      .map((m): NsqfMapping | null => {
        const entry = nsqfByCode.get(m.qpCode);
        if (!entry) return null;
        return {
          rawSkillText: body.transcript,
          normalizedSkill: m.normalizedSkill,
          nsqfQualificationId: entry.id,
          qpCode: entry.qpCode,
          title: entry.title,
          sector: entry.sector,
          nsqfLevel: entry.nsqfLevel,
          confidence: Math.max(0, Math.min(1, m.confidence)),
          method: "ai-semantic",
          pmajayVerified: false,
          pmajayCourse: null,
        };
      })
      .filter((m): m is NsqfMapping => m !== null);

    if (mappings.length === 0) {
      mappings.push({
        rawSkillText: body.transcript,
        normalizedSkill: "unknown",
        nsqfQualificationId: null,
        qpCode: null,
        title: null,
        sector: null,
        nsqfLevel: null,
        confidence: 0,
        method: "ai-semantic",
        pmajayVerified: false,
        pmajayCourse: null,
      });
    }

    const recommendations = result.recommendedProgramIds
      .map((r) => {
        const p = programById.get(r.id);
        if (!p) return null;
        return {
          trainingProgramId: p.id,
          name: p.name,
          nameHindi: p.nameHindi,
          scheme: p.scheme,
          component: p.component,
          sector: p.sector,
          nsqfLevel: p.nsqfLevel,
          mode: p.mode,
          durationWeeks: p.durationWeeks,
          stipend: p.stipend,
          district: p.district,
          state: p.state,
          contactPhone: p.contactPhone,
          seatsAvailable: p.seatsAvailable,
          score: Math.max(0, Math.min(1, r.score)),
          rationale: r.rationale,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    // Best-effort: mirror this session into the real backend so it still
    // shows up in the admin dashboard's analytics. Never blocks or fails
    // the user-facing response.
    fetch(`${API_BASE}/api/assistant/converse`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transcript: body.transcript,
        language: body.language,
        state: body.state,
        district: body.district,
        userId: body.userId,
        channel: "WEB",
      }),
    }).catch(() => {});

    return NextResponse.json({
      sessionId: `ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      transcript: body.transcript,
      language: body.language,
      mappings,
      recommendations,
      reply: { text: result.reply, audioUrl: "", format: "text" },
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Understanding failed" }, { status: 502 });
  }
}
