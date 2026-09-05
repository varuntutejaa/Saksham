import { env, hasGroq } from "../lib/env.js";
import { searchKnowledge } from "./knowledge.js";

const GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_CHAT_MODEL = "openai/gpt-oss-120b";

export interface RagSource {
  documentTitle: string;
  sourceUrl: string;
  page: number;
}

export interface RagAnswer {
  answer: string;
  sources: RagSource[];
  /** false when nothing relevant was found at all — `answer` is then a fixed
   *  "I don't have that information" reply, not a guess. */
  grounded: boolean;
}

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English", hi: "Hindi", bn: "Bengali", ta: "Tamil", te: "Telugu",
  mr: "Marathi", kn: "Kannada", gu: "Gujarati", pa: "Punjabi", or: "Odia",
};

const NO_CONTEXT_REPLY: Record<string, string> = {
  en: "I don't have information about that in the PM-AJAY or NSQF documents I have access to.",
  hi: "मेरे पास उपलब्ध PM-AJAY या NSQF दस्तावेज़ों में इस बारे में जानकारी नहीं है।",
  bn: "আমার কাছে থাকা PM-AJAY বা NSQF নথিতে এই বিষয়ে তথ্য নেই।",
  ta: "எனக்கு கிடைக்கும் PM-AJAY அல்லது NSQF ஆவணங்களில் இது பற்றிய தகவல் இல்லை.",
  te: "నా వద్ద ఉన్న PM-AJAY లేదా NSQF పత్రాలలో దీని గురించి సమాచారం లేదు.",
  mr: "माझ्याकडे उपलब्ध असलेल्या PM-AJAY किंवा NSQF कागदपत्रांमध्ये याबद्दल माहिती नाही.",
  kn: "ನನ್ನ ಬಳಿ ಇರುವ PM-AJAY ಅಥವಾ NSQF ದಾಖಲೆಗಳಲ್ಲಿ ಈ ಬಗ್ಗೆ ಮಾಹಿತಿ ಇಲ್ಲ.",
  gu: "મારી પાસે ઉપલબ્ધ PM-AJAY અથવા NSQF દસ્તાવેજોમાં આ વિશે માહિતી નથી.",
  pa: "ਮੇਰੇ ਕੋਲ ਉਪਲਬਧ PM-AJAY ਜਾਂ NSQF ਦਸਤਾਵੇਜ਼ਾਂ ਵਿੱਚ ਇਸ ਬਾਰੇ ਜਾਣਕਾਰੀ ਨਹੀਂ ਹੈ।",
  or: "ମୋ ପାଖରେ ଥିବା PM-AJAY କିମ୍ବା NSQF ଡକ୍ୟୁମେଣ୍ଟରେ ଏ ବିଷୟରେ ସୂଚନା ନାହିଁ।",
};

interface GroqChatResponse {
  choices?: { message?: { content?: string } }[];
}

/**
 * RAG: retrieve real passages (services/knowledge.ts), then have an LLM
 * (Groq) compose a short spoken-style answer strictly from those passages —
 * never from its own general knowledge. If nothing relevant is found, or no
 * Groq key is configured, this never fabricates: it either returns a fixed
 * "I don't know" reply or the top passage verbatim.
 */
export async function answerFromDocuments(question: string, language: string): Promise<RagAnswer> {
  const matches = await searchKnowledge(question, 5);

  if (matches.length === 0) {
    return { answer: NO_CONTEXT_REPLY[language] ?? NO_CONTEXT_REPLY.en, sources: [], grounded: false };
  }

  const sources: RagSource[] = matches.map((m) => ({
    documentTitle: m.documentTitle,
    sourceUrl: m.sourceUrl,
    page: m.page,
  }));

  if (!hasGroq) {
    // No LLM configured — extractive fallback: the top-ranked real passage,
    // verbatim, rather than no answer at all.
    return { answer: matches[0].text, sources, grounded: true };
  }

  const context = matches
    .map((m, i) => `[${i + 1}] (${m.documentTitle}, page ${m.page})\n${m.text}`)
    .join("\n\n");
  const languageName = LANGUAGE_NAMES[language] ?? "English";

  const systemPrompt =
    "You are answering a question for a beneficiary using the Saksham voice assistant " +
    "(PM-AJAY skilling scheme, Ministry of Social Justice & Empowerment, India). " +
    "Answer ONLY using the numbered passages below, taken from real government documents. " +
    "If the passages don't contain the answer, say clearly that you don't have that information — " +
    "never guess or invent details, and never use outside knowledge. " +
    `Keep the answer short (2-4 sentences), in plain ${languageName}, suitable to be read aloud. ` +
    "Cite which passage number(s) you used at the end in brackets, e.g. [1][2].\n\n" +
    context;

  const res = await fetch(GROQ_CHAT_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.groqApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: GROQ_CHAT_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: question },
      ],
      temperature: 0.2,
      max_tokens: 400,
    }),
  });

  if (!res.ok) {
    throw new Error(`Groq chat completion failed ${res.status}: ${await res.text()}`);
  }

  const body = (await res.json()) as GroqChatResponse;
  const answer = body.choices?.[0]?.message?.content?.trim();
  if (!answer) throw new Error("Groq returned an empty answer");

  return { answer, sources, grounded: true };
}
