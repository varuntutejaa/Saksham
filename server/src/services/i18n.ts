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
  te: {
    prefix: "సూచించబడింది ఎందుకంటే ",
    suffix: ".",
    join: ", మరియు ",
    nsqf: "ఇది మీ నైపుణ్యానికి సంబంధించిన NSQF అర్హతతో సరిపోతుంది",
    sector: (s) => `మీరు ఇప్పటికే పనిచేస్తున్న ${s} రంగంలో ఇది ఉంది`,
    district: (d) => `ఇది మీకు దగ్గరగా ఉన్న ${d} జిల్లాలో జరుగుతుంది`,
    state: "ఇది మీ రాష్ట్రంలో జరుగుతుంది",
    stipend: "శిక్షణ సమయంలో స్టైపెండ్ లభిస్తుంది",
    seats: "ఇప్పుడు సీట్లు అందుబాటులో ఉన్నాయి",
    generic: "ఇది మీకు సంబంధించిన PM-AJAY నైపుణ్య కార్యక్రమం",
  },
  mr: {
    prefix: "हे सुचवले आहे कारण ",
    suffix: ".",
    join: ", आणि ",
    nsqf: "हे तुमच्या कौशल्याच्या NSQF पात्रतेशी जुळते",
    sector: (s) => `हे तुम्ही आधीपासून काम करत असलेल्या ${s} क्षेत्रात आहे`,
    district: (d) => `हे तुमच्या जवळच्या ${d} जिल्ह्यात चालते`,
    state: "हे तुमच्या राज्यात चालते",
    stipend: "प्रशिक्षणादरम्यान स्टायपेंड मिळतो",
    seats: "आता जागा उपलब्ध आहेत",
    generic: "हा तुमच्यासाठी संबंधित PM-AJAY कौशल्य कार्यक्रम आहे",
  },
  kn: {
    prefix: "ಶಿಫಾರಸು ಮಾಡಲಾಗಿದೆ ಏಕೆಂದರೆ ",
    suffix: ".",
    join: ", ಮತ್ತು ",
    nsqf: "ಇದು ನಿಮ್ಮ ಕೌಶಲ್ಯದ NSQF ಅರ್ಹತೆಗೆ ಹೊಂದುತ್ತದೆ",
    sector: (s) => `ನೀವು ಈಗಾಗಲೇ ಕೆಲಸ ಮಾಡುವ ${s} ಕ್ಷೇತ್ರದಲ್ಲಿದೆ`,
    district: (d) => `ಇದು ನಿಮ್ಮ ಹತ್ತಿರದ ${d} ಜಿಲ್ಲೆಯಲ್ಲಿ ನಡೆಯುತ್ತದೆ`,
    state: "ಇದು ನಿಮ್ಮ ರಾಜ್ಯದಲ್ಲಿ ನಡೆಯುತ್ತದೆ",
    stipend: "ತರಬೇತಿ ಸಮಯದಲ್ಲಿ ಸ್ಟೈಪೆಂಡ್ ಸಿಗುತ್ತದೆ",
    seats: "ಈಗ ಸೀಟುಗಳು ಲಭ್ಯವಿವೆ",
    generic: "ಇದು ನಿಮಗೆ ಸಂಬಂಧಿಸಿದ PM-AJAY ಕೌಶಲ್ಯ ಕಾರ್ಯಕ್ರಮ",
  },
  gu: {
    prefix: "ભલામણ કરવામાં આવી છે કારણ કે ",
    suffix: ".",
    join: ", અને ",
    nsqf: "તે તમારા કૌશલ્યની NSQF લાયકાત સાથે મેળ ખાય છે",
    sector: (s) => `તે તમે પહેલેથી કામ કરતા ${s} ક્ષેત્રમાં છે`,
    district: (d) => `તે તમારી નજીકના ${d} જિલ્લામાં ચાલે છે`,
    state: "તે તમારા રાજ્યમાં ચાલે છે",
    stipend: "તાલીમ દરમિયાન સ્ટાઇપેન્ડ મળે છે",
    seats: "હાલમાં બેઠકો ઉપલબ્ધ છે",
    generic: "આ તમારા માટે સંબંધિત PM-AJAY કૌશલ્ય કાર્યક્રમ છે",
  },
  pa: {
    prefix: "ਸੁਝਾਅ ਦਿੱਤਾ ਗਿਆ ਹੈ ਕਿਉਂਕਿ ",
    suffix: ".",
    join: ", ਅਤੇ ",
    nsqf: "ਇਹ ਤੁਹਾਡੇ ਹੁਨਰ ਦੀ NSQF ਯੋਗਤਾ ਨਾਲ ਮਿਲਦਾ ਹੈ",
    sector: (s) => `ਇਹ ਉਸ ${s} ਖੇਤਰ ਵਿੱਚ ਹੈ ਜਿਸ ਵਿੱਚ ਤੁਸੀਂ ਪਹਿਲਾਂ ਹੀ ਕੰਮ ਕਰਦੇ ਹੋ`,
    district: (d) => `ਇਹ ਤੁਹਾਡੇ ਨੇੜੇ ${d} ਜ਼ਿਲ੍ਹੇ ਵਿੱਚ ਚਲਦਾ ਹੈ`,
    state: "ਇਹ ਤੁਹਾਡੇ ਰਾਜ ਵਿੱਚ ਚਲਦਾ ਹੈ",
    stipend: "ਟ੍ਰੇਨਿੰਗ ਦੌਰਾਨ ਸਟਾਈਪੈਂਡ ਮਿਲਦਾ ਹੈ",
    seats: "ਹੁਣ ਸੀਟਾਂ ਉਪਲਬਧ ਹਨ",
    generic: "ਇਹ ਤੁਹਾਡੇ ਲਈ ਸੰਬੰਧਿਤ PM-AJAY ਹੁਨਰ ਪ੍ਰੋਗਰਾਮ ਹੈ",
  },
  or: {
    prefix: "ସୁପାରିଶ କରାଯାଇଛି କାରଣ ",
    suffix: ".",
    join: ", ଏବଂ ",
    nsqf: "ଏହା ଆପଣଙ୍କ କୌଶଳର NSQF ଯୋଗ୍ୟତା ସହିତ ମେଳ ଖାଉଛି",
    sector: (s) => `ଏହା ଆପଣ ପୂର୍ବରୁ କାମ କରୁଥିବା ${s} କ୍ଷେତ୍ରରେ ଅଛି`,
    district: (d) => `ଏହା ଆପଣଙ୍କ ନିକଟର ${d} ଜିଲ୍ଲାରେ ଚାଲେ`,
    state: "ଏହା ଆପଣଙ୍କ ରାଜ୍ୟରେ ଚାଲେ",
    stipend: "ପ୍ରଶିକ୍ଷଣ ସମୟରେ ଷ୍ଟାଇପେଣ୍ଡ ମିଳେ",
    seats: "ବର୍ତ୍ତମାନ ସିଟ୍ ଉପଲବ୍ଧ ଅଛି",
    generic: "ଏହା ଆପଣଙ୍କ ପାଇଁ ସମ୍ପର୍କିତ PM-AJAY କୌଶଳ କାର୍ଯ୍ୟକ୍ରମ",
  },
};
