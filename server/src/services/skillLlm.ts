import { env, hasGroq } from "../lib/env.js";
import { SKILL_LEXICON } from "./skillLexicon.js";

const GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_CHAT_MODEL = "openai/gpt-oss-120b";

interface GroqChatResponse {
  choices?: { message?: { content?: string } }[];
}

/** Every skill the pipeline can map to. The model must pick from this list —
 *  anything else is discarded, so it can never invent a trade the catalogue
 *  has no qualification for. */
const ALLOWED = SKILL_LEXICON.map((e) => e.normalized);

/**
 * Fallback for when the keyword lexicon finds nothing.
 *
 * The lexicon only fires on phrases someone thought to write down, so a
 * beneficiary who describes their trade in their own words — "I do something
 * related to honey", "I work with cows all day" — gets no match at all even
 * though the trade is plainly in the catalogue. This asks the model to name
 * the trade instead, constrained to the tokens the lexicon already knows so
 * the rest of the pipeline is unchanged.
 *
 * Returns [] when nothing fits, so the caller still says "I didn't understand"
 * rather than mapping someone onto a trade they never mentioned.
 */
export async function classifySkillsWithLlm(transcript: string): Promise<string[]> {
  if (!hasGroq || !transcript.trim()) return [];

  try {
    const res = await fetch(GROQ_CHAT_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${env.groqApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: GROQ_CHAT_MODEL,
        messages: [
          {
            role: "system",
            content:
              "You identify which traditional trades or occupations a person is describing. " +
              "Their words may be in any Indian language, romanized, or mixed with English, and " +
              "they often describe the work rather than naming it (e.g. \"I do something with honey\" " +
              "is beekeeping; \"I make things from mud\" is pottery; \"I look after cows and sell milk\" " +
              "is dairy-livestock).\n\n" +
              `Reply with a comma-separated list of matching values from this exact list:\n${ALLOWED.join(", ")}\n\n` +
              "Rules: use ONLY values from that list, copied exactly. List at most 3, most relevant first. " +
              "If the person has not described any trade or occupation at all, reply exactly: none",
          },
          { role: "user", content: transcript },
        ],
        temperature: 0,
        // gpt-oss-120b reasons before answering; too low a cap truncates
        // before any content is emitted (see services/profileExtract.ts)
        max_tokens: 200,
      }),
    });
    if (!res.ok) {
      console.error(`[skill-llm] Groq classification failed ${res.status}`);
      return [];
    }

    const body = (await res.json()) as GroqChatResponse;
    const raw = body.choices?.[0]?.message?.content?.trim().toLowerCase() ?? "";
    if (!raw || raw === "none") return [];

    // keep only real lexicon tokens — the model does not get to invent trades
    const allowed = new Set(ALLOWED);
    return [...new Set(raw.split(/[,\n]/).map((t) => t.trim()).filter((t) => allowed.has(t)))].slice(0, 3);
  } catch (err) {
    console.error("[skill-llm] classification error:", err);
    return [];
  }
}
