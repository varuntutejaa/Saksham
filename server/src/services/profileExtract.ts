import { env, hasGroq } from "../lib/env.js";

const GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_CHAT_MODEL = "openai/gpt-oss-120b";

export type ProfileField = "gender" | "age" | "education";

const ENUM_OPTIONS: Record<"gender" | "education", string[]> = {
  gender: ["male", "female", "other"],
  education: ["below_10th", "10th", "12th", "iti_diploma", "undergrad", "postgrad"],
};

interface GroqChatResponse {
  choices?: { message?: { content?: string } }[];
}

function regexAgeFallback(answer: string): number | null {
  const match = answer.match(/\d{1,3}/);
  if (!match) return null;
  const n = Number(match[0]);
  return n >= 10 && n <= 100 ? n : null;
}

/**
 * Voice profiling (onboarding/voice-profile.tsx): the beneficiary answers
 * gender/age/education by speaking or typing free text, in any of the 10
 * languages, romanized or not — this turns that free text into the
 * structured value the profile actually needs. Returns null when the
 * answer genuinely can't be classified (caller re-asks), never a guess.
 */
export async function extractProfileAnswer(
  field: ProfileField,
  answer: string,
  language: string,
): Promise<string | number | null> {
  if (!hasGroq) {
    return field === "age" ? regexAgeFallback(answer) : null;
  }

  const instruction =
    field === "age"
      ? "Extract the person's age as a single integer between 10 and 100. The number may be spoken as a word in any language (e.g. Hindi \"paccis\" = 25, \"tees\" = 30, \"chalis\" = 40, \"pachaas\" = 50) rather than digits — convert it carefully and precisely, do not guess a rounder nearby number. Reply with ONLY the final integer, nothing else. If no clear age is stated, reply exactly: unclear"
      : `Classify the answer into exactly one of these options: ${ENUM_OPTIONS[field].join(", ")}. Reply with ONLY one of those exact words, nothing else. If it doesn't clearly fit any option, reply exactly: unclear`;

  const res = await fetch(GROQ_CHAT_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.groqApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: GROQ_CHAT_MODEL,
      messages: [
        {
          role: "system",
          content:
            `You extract one structured field from a beneficiary's spoken answer (given as text, possibly in ${language}, romanized, or mixed language). ` +
            instruction,
        },
        { role: "user", content: answer },
      ],
      temperature: 0,
      // openai/gpt-oss-120b is a reasoning model that spends tokens on an
      // internal "reasoning" pass before the actual one-word answer — a
      // low cap here (originally 10) gets entirely consumed by that
      // reasoning and truncates before any real content comes out
      // (finish_reason "length", empty content). 150 leaves room for both.
      max_tokens: 150,
    }),
  });

  if (!res.ok) {
    throw new Error(`Groq profile extraction failed ${res.status}: ${await res.text()}`);
  }

  const body = (await res.json()) as GroqChatResponse;
  const raw = body.choices?.[0]?.message?.content?.trim().toLowerCase();
  if (!raw || raw.includes("unclear")) return null;

  if (field === "age") {
    const n = Number(raw.replace(/[^\d]/g, ""));
    return Number.isFinite(n) && n >= 10 && n <= 100 ? n : null;
  }
  return ENUM_OPTIONS[field].includes(raw) ? raw : null;
}
