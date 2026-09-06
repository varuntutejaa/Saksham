import { env, hasGroq } from "../lib/env.js";

const GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_CHAT_MODEL = "openai/gpt-oss-120b";

export type ProfileField = "name" | "gender" | "age" | "education" | "experienceYears" | "workPreference";

const ENUM_OPTIONS: Record<"gender" | "education" | "workPreference", string[]> = {
  gender: ["male", "female", "other"],
  education: ["below_10th", "10th", "12th", "iti_diploma", "undergrad", "postgrad"],
  // where they want to work: at/near where they live, or somewhere else
  workPreference: ["home", "other"],
};

interface GroqChatResponse {
  choices?: { message?: { content?: string } }[];
}

function regexAgeFallback(answer: string): number | null {
  const text = normalizeAnswer(answer);
  const match = text.match(/\d{1,3}/);
  if (!match) return null;
  const n = Number(match[0]);
  return n >= 10 && n <= 100 ? n : null;
}

const HINDI_AGE_WORDS: [RegExp, number][] = [
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
  [/\b(ikkis|ekkees)\b|इक्कीस/u, 21],
  [/\b(bais|baees)\b|बाईस/u, 22],
  [/\b(teis|teees)\b|तेईस/u, 23],
  [/\b(chaubis|chaubees)\b|चौबीस/u, 24],
  [/\b(pachis|pachees)\b|पच्चीस/u, 25],
  [/\b(chabbis|chhabbis)\b|छब्बीस/u, 26],
  [/\b(sattais|sattaees)\b|सत्ताईस/u, 27],
  [/\b(athais|atthais|atthaees)\b|अट्ठाईस/u, 28],
  [/\b(untis|untees)\b|उनतीस/u, 29],
  [/\b(tis|tees)\b|तीस/u, 30],
  [/\b(iktis|iktees)\b|इकतीस/u, 31],
  [/\b(battis|battees)\b|बत्तीस/u, 32],
  [/\b(tetis|tentees)\b|तैंतीस/u, 33],
  [/\b(chautis|chauntees)\b|चौंतीस/u, 34],
  [/\b(paitis|paintees)\b|पैंतीस/u, 35],
  [/\b(chattis|chhattis)\b|छत्तीस/u, 36],
  [/\b(saintis|saintees)\b|सैंतीस/u, 37],
  [/\b(adhtis|adtees|athtees)\b|अड़तीस/u, 38],
  [/\b(untalis|untalees)\b|उनतालीस/u, 39],
  [/\b(chalis|chaalis)\b|चालीस/u, 40],
  [/\b(paintalis|paintalees)\b|पैंतालीस/u, 45],
  [/\b(pachas|pachaas)\b|पचास/u, 50],
  [/\b(sath|saath)\b|साठ/u, 60],
  [/\b(sattar)\b|सत्तर/u, 70],
  [/\b(assi|asi)\b|अस्सी/u, 80],
  [/\b(nabbe|nabbeey)\b|नब्बे/u, 90],
  [/\b(sau|sao)\b|सौ/u, 100],
];

const URDU_AGE_WORDS: [RegExp, number][] = [
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

function normalizeAnswer(answer: string): string {
  return answer
    .toLowerCase()
    .normalize("NFC")
    .replace(/[०-९]/g, (digit) => String("०१२३४५६७८९".indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[।,.;:!?'"()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function fallbackName(answer: string): string | null {
  const cleaned = answer
    .replace(/^(my name is|i am|i'm|mera naam|मेरा नाम|main|mein|मैं)\s+/i, "")
    .replace(/\s+(hai|है)$/i, "")
    .replace(/["'.]/g, "")
    .trim();
  return cleaned.length > 1 && cleaned.length <= 80 ? cleaned : null;
}

function fallbackAge(answer: string): number | null {
  const digit = regexAgeFallback(answer);
  if (digit !== null) return digit;
  const text = normalizeAnswer(answer);
  for (const [pattern, value] of HINDI_AGE_WORDS) {
    if (pattern.test(text)) return value;
  }
  for (const [pattern, value] of URDU_AGE_WORDS) {
    if (pattern.test(text)) return value;
  }
  return null;
}

function fallbackGender(answer: string): string | null {
  const text = normalizeAnswer(answer);
  if (/\b(female|woman|girl|lady|mahila|ladki)\b|महिला|औरत|लड़की|स्त्री/u.test(text)) return "female";
  if (/\b(male|man|boy|aadmi|ladka|purush)\b|पुरुष|आदमी|लड़का/u.test(text)) return "male";
  if (/\b(other|transgender|non binary|non-binary)\b|अन्य|ट्रांसजेंडर/u.test(text)) return "other";
  return null;
}

function fallbackEducation(answer: string): string | null {
  const text = normalizeAnswer(answer);
  if (/\b(postgrad|post graduate|post graduation|masters?|m\.?a|m\.?com|m\.?sc|pg)\b|स्नातकोत्तर|मास्टर/u.test(text)) return "postgrad";
  if (/\b(undergrad|graduate|graduation|degree|bachelor|b\.?a|b\.?com|b\.?sc|ba|bcom|bsc)\b|स्नातक|ग्रेजुएट|बीए|बी कॉम|बीएससी/u.test(text)) return "undergrad";
  if (/\b(iti|diploma|polytechnic)\b|आईटीआई|डिप्लोमा/u.test(text)) return "iti_diploma";
  if (/\b(12th|xii|twelfth|intermediate|senior secondary|barahvi|baarahvi|barvi)\b|बारहवीं|१२वीं|12वीं|12 वीं/u.test(text)) return "12th";
  if (/\b(10th|xth|tenth|matric|secondary|dasvi|dasveen|daswin)\b|दसवीं|१०वीं|10वीं|10 वीं/u.test(text)) return "10th";
  if (/\b(1st|2nd|3rd|4th|5th|6th|7th|8th|9th|primary|middle|below tenth|below 10th|ninth|eighth|seventh|sixth|fifth)\b|पहली|दूसरी|तीसरी|चौथी|पांचवीं|छठी|सातवीं|आठवीं|नौवीं/u.test(text)) return "below_10th";
  if (/\b(no school|not studied|illiterate|literate|none|nahi padha|nahi padhi)\b|नहीं पढ़ा|नहीं पढ़ी|अनपढ़/u.test(text)) return "below_10th";
  return null;
}

/** Years of experience. "no experience"/"naya" is a real answer meaning 0,
 *  not a failure to understand, so it maps to 0 rather than null. */
function fallbackExperience(answer: string): number | null {
  const text = normalizeAnswer(answer);
  if (/\b(no experience|none|fresher|new|naya|nayi|abhi shuru|just started)\b|कोई नहीं|नया|नई|अभी शुरू/u.test(text)) return 0;
  const match = text.match(/\d{1,2}/);
  if (!match) return null;
  const n = Number(match[0]);
  return n >= 0 && n <= 70 ? n : null;
}

function fallbackWorkPreference(answer: string): string | null {
  const text = normalizeAnswer(answer);
  if (/\b(home|ghar|apne ghar|yahin|yaha|nearby|paas|pass|local|same place)\b|घर|यहीं|यहाँ|पास/u.test(text)) return "home";
  if (/\b(other|another|different|bahar|dusri|doosri|kahin aur|shehar|city)\b|बाहर|दूसरी|कहीं और|शहर/u.test(text)) return "other";
  return null;
}

function localProfileFallback(field: ProfileField, answer: string): string | number | null {
  if (field === "name") return fallbackName(answer);
  if (field === "age") return fallbackAge(answer);
  if (field === "gender") return fallbackGender(answer);
  if (field === "experienceYears") return fallbackExperience(answer);
  if (field === "workPreference") return fallbackWorkPreference(answer);
  return fallbackEducation(answer);
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
    return localProfileFallback(field, answer);
  }

  const instruction =
    field === "experienceYears"
      ? "Extract how many YEARS the person has been doing their work, as a single integer 0-70. The number may be spoken as a word in any language (Hindi \"do saal\" = 2, \"paanch saal\" = 5, \"das saal\" = 10). If they say they are new, a beginner, or have no experience, reply exactly: 0. Reply with ONLY the integer. If no clear duration is stated, reply exactly: unclear"
      : field === "workPreference"
        ? "Decide where the person wants to work. Reply exactly \"home\" if they want to work at home, from home, near home, in their own village or their current area. Reply exactly \"other\" if they want to work somewhere else, in another city, town or district, or are willing to relocate. Reply with ONLY one of those two words. If it is not clear, reply exactly: unclear"
      : field === "age"
      ? "Extract the person's age as a single integer between 10 and 100. The number may be spoken as a word in any language (e.g. Hindi \"paccis\" = 25, \"tees\" = 30, \"chalis\" = 40, \"pachaas\" = 50) rather than digits — convert it carefully and precisely, do not guess a rounder nearby number. Reply with ONLY the final integer, nothing else. If no clear age is stated, reply exactly: unclear"
      : field === "name"
        ? "Extract just the person's own name from their answer, dropping filler words like \"my name is\" / \"mera naam ... hai\". Reply with ONLY their name, properly capitalized, transliterated to plain Latin letters if it was spoken in another script or language. If no name is clearly stated, reply exactly: unclear"
        : `Classify the answer into exactly one of these options: ${ENUM_OPTIONS[field].join(", ")}. Reply with ONLY one of those exact words, nothing else. If it doesn't clearly fit any option, reply exactly: unclear`;

  let res: Response;
  try {
    res = await fetch(GROQ_CHAT_URL, {
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
  } catch {
    return localProfileFallback(field, answer);
  }

  if (!res.ok) {
    return localProfileFallback(field, answer);
  }

  const body = (await res.json()) as GroqChatResponse;
  const rawContent = body.choices?.[0]?.message?.content?.trim();
  if (!rawContent || rawContent.toLowerCase().includes("unclear")) return localProfileFallback(field, answer);

  if (field === "name") {
    // keep original casing/script — this is a proper noun, not an enum
    const cleaned = rawContent.replace(/["'.]/g, "").trim();
    return cleaned.length > 0 && cleaned.length <= 80 ? cleaned : localProfileFallback(field, answer);
  }

  const raw = rawContent.toLowerCase();
  if (field === "age" || field === "experienceYears") {
    const digits = raw.replace(/[^\d]/g, "");
    // "0" is a real answer for experience (a beginner), so an empty string —
    // not a falsy number — is what means "nothing extracted"
    if (digits === "") return localProfileFallback(field, answer);
    const n = Number(digits);
    const [min, max] = field === "age" ? [10, 100] : [0, 70];
    return Number.isFinite(n) && n >= min && n <= max ? n : localProfileFallback(field, answer);
  }
  return ENUM_OPTIONS[field].includes(raw) ? raw : localProfileFallback(field, answer);
}
