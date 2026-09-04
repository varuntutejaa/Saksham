import type { Language } from "@prisma/client";

type Reason = "nsqf" | "sector" | "district" | "state" | "seats" | "stipend" | string;

interface Ctx {
  sector?: string;
  district?: string;
}

/**
 * Build a short, human-readable "why this programme" sentence in the
 * beneficiary's language. Kept as templated strings (not free LLM text) so the
 * audio output is predictable and the reasoning is auditable.
 */
export function rationalePhrase(lang: Language, reasons: Reason[], ctx: Ctx = {}): string {
  const t = TEMPLATES[lang] ?? TEMPLATES.en;
  const parts: string[] = [];
  if (reasons.includes("nsqf")) parts.push(t.nsqf);
  if (reasons.includes("sector") && ctx.sector) parts.push(t.sector(ctx.sector));
  if (reasons.includes("district") && ctx.district) parts.push(t.district(ctx.district));
  else if (reasons.includes("state")) parts.push(t.state);
  if (reasons.includes("stipend")) parts.push(t.stipend);
  if (reasons.includes("seats")) parts.push(t.seats);
  if (parts.length === 0) return t.generic;
  return t.prefix + parts.join(t.join) + t.suffix;
}

interface Template {
  prefix: string;
  suffix: string;
  join: string;
  nsqf: string;
  sector: (s: string) => string;
  district: (d: string) => string;
  state: string;
  stipend: string;
  seats: string;
  generic: string;
}

const TEMPLATES: Partial<Record<Language, Template>> & { en: Template } = {
  en: {
    prefix: "Recommended because ",
    suffix: ".",
    join: ", and ",
    nsqf: "it matches your skill's NSQF qualification",
    sector: (s) => `it is in the ${s} sector you already work in`,
    district: (d) => `it runs in ${d} district near you`,
    state: "it runs in your state",
    stipend: "it pays a stipend during training",
    seats: "seats are available now",
    generic: "it is a PM-AJAY skilling programme relevant to you",
  },
  hi: {
    prefix: "यह सुझाया गया क्योंकि ",
    suffix: "।",
    join: ", और ",
    nsqf: "यह आपके हुनर के NSQF योग्यता से मेल खाता है",
    sector: (s) => `यह उसी ${s} क्षेत्र में है जिसमें आप पहले से काम करते हैं`,
    district: (d) => `यह आपके पास ${d} जिले में चलता है`,
    state: "यह आपके राज्य में चलता है",
    stipend: "प्रशिक्षण के दौरान वजीफा मिलता है",
    seats: "अभी सीटें उपलब्ध हैं",
    generic: "यह आपके लिए प्रासंगिक PM-AJAY कौशल कार्यक्रम है",
  },
  bn: {
    prefix: "সুপারিশ করা হয়েছে কারণ ",
    suffix: "।",
    join: ", এবং ",
    nsqf: "এটি আপনার দক্ষতার NSQF যোগ্যতার সাথে মেলে",
    sector: (s) => `এটি ${s} ক্ষেত্রে যেখানে আপনি ইতিমধ্যে কাজ করেন`,
    district: (d) => `এটি আপনার কাছে ${d} জেলায় চলে`,
    state: "এটি আপনার রাজ্যে চলে",
    stipend: "প্রশিক্ষণের সময় ভাতা দেওয়া হয়",
    seats: "এখন আসন উপলব্ধ",
    generic: "এটি আপনার জন্য প্রাসঙ্গিক একটি PM-AJAY দক্ষতা কর্মসূচি",
  },
  ta: {
    prefix: "பரிந்துரைக்கப்படுகிறது ஏனெனில் ",
    suffix: ".",
    join: ", மற்றும் ",
    nsqf: "இது உங்கள் திறனின் NSQF தகுதிக்கு பொருந்துகிறது",
    sector: (s) => `நீங்கள் ஏற்கனவே பணிபுரியும் ${s} துறையில் இது உள்ளது`,
    district: (d) => `இது உங்களுக்கு அருகில் ${d} மாவட்டத்தில் நடைபெறுகிறது`,
    state: "இது உங்கள் மாநிலத்தில் நடைபெறுகிறது",
    stipend: "பயிற்சியின் போது உதவித்தொகை வழங்கப்படுகிறது",
    seats: "இப்போது இடங்கள் உள்ளன",
    generic: "இது உங்களுக்கு பொருத்தமான PM-AJAY திறன் திட்டம்",
  },
};
