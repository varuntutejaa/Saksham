/**
 * Templated (not LLM-generated) spoken/text reply for a converse turn — shared
 * by the app/web /converse pipeline and the WhatsApp webhook so both channels
 * describe the same skill match + recommendations identically per language.
 */
export function buildSpokenReply(
  lang: string,
  mappings: { title: string | null; nsqfLevel: number | null }[],
  recs: { name: string; nameHindi: string | null; rationale: string }[],
): string {
  const known = mappings.filter((m) => m.title);
  const skillList = known.map((m) => m.title).join(", ");
  const nsqfLevel = known[0]?.nsqfLevel ?? "";
  const copy: Record<string, { found: string; unknown: string; lead: string; programName: (r: { name: string; nameHindi: string | null }) => string }> = {
    en: {
      found: `Your skill matches ${skillList} (NSQF level ${nsqfLevel}).`,
      unknown: "I could not fully understand your skill, please say it again.",
      lead: " Recommended training for you: ",
      programName: (r) => r.name,
    },
    hi: {
      found: `आपका हुनर ${skillList} (NSQF स्तर ${nsqfLevel}) से मेल खाता है।`,
      unknown: "मुझे आपका हुनर पूरी तरह समझ नहीं आया, कृपया दोबारा बताइए।",
      lead: " आपके लिए सुझाए गए प्रशिक्षण: ",
      programName: (r) => r.nameHindi ?? r.name,
    },
    bn: {
      found: `আপনার দক্ষতা ${skillList} (NSQF স্তর ${nsqfLevel})-এর সঙ্গে মেলে।`,
      unknown: "আমি আপনার দক্ষতা পুরোপুরি বুঝতে পারিনি, অনুগ্রহ করে আবার বলুন।",
      lead: " আপনার জন্য প্রস্তাবিত প্রশিক্ষণ: ",
      programName: (r) => r.nameHindi ?? r.name,
    },
    ta: {
      found: `உங்கள் திறன் ${skillList} (NSQF நிலை ${nsqfLevel}) உடன் பொருந்துகிறது.`,
      unknown: "உங்கள் திறனை முழுமையாக புரிந்துகொள்ள முடியவில்லை, தயவுசெய்து மீண்டும் சொல்லுங்கள்.",
      lead: " உங்களுக்கான பரிந்துரைக்கப்பட்ட பயிற்சி: ",
      programName: (r) => r.nameHindi ?? r.name,
    },
    te: {
      found: `మీ నైపుణ్యం ${skillList} (NSQF స్థాయి ${nsqfLevel})తో సరిపోతుంది.`,
      unknown: "మీ నైపుణ్యాన్ని పూర్తిగా అర్థం చేసుకోలేకపోయాను, దయచేసి మళ్లీ చెప్పండి.",
      lead: " మీ కోసం సూచించిన శిక్షణ: ",
      programName: (r) => r.nameHindi ?? r.name,
    },
    mr: {
      found: `तुमचे कौशल्य ${skillList} (NSQF स्तर ${nsqfLevel}) शी जुळते.`,
      unknown: "तुमचे कौशल्य पूर्णपणे समजले नाही, कृपया पुन्हा सांगा.",
      lead: " तुमच्यासाठी सुचवलेले प्रशिक्षण: ",
      programName: (r) => r.nameHindi ?? r.name,
    },
    kn: {
      found: `ನಿಮ್ಮ ಕೌಶಲ್ಯ ${skillList} (NSQF ಮಟ್ಟ ${nsqfLevel})ಕ್ಕೆ ಹೊಂದುತ್ತದೆ.`,
      unknown: "ನಿಮ್ಮ ಕೌಶಲ್ಯವನ್ನು ಸಂಪೂರ್ಣವಾಗಿ ಅರ್ಥಮಾಡಿಕೊಳ್ಳಲಾಗಲಿಲ್ಲ, ದಯವಿಟ್ಟು ಮತ್ತೆ ಹೇಳಿ.",
      lead: " ನಿಮಗಾಗಿ ಶಿಫಾರಸು ಮಾಡಿದ ತರಬೇತಿ: ",
      programName: (r) => r.nameHindi ?? r.name,
    },
    gu: {
      found: `તમારું કૌશલ્ય ${skillList} (NSQF સ્તર ${nsqfLevel}) સાથે મેળ ખાતું છે.`,
      unknown: "તમારું કૌશલ્ય સંપૂર્ણ રીતે સમજાયું નથી, કૃપા કરીને ફરી કહો.",
      lead: " તમારા માટે ભલામણ કરેલ તાલીમ: ",
      programName: (r) => r.nameHindi ?? r.name,
    },
    pa: {
      found: `ਤੁਹਾਡਾ ਹੁਨਰ ${skillList} (NSQF ਪੱਧਰ ${nsqfLevel}) ਨਾਲ ਮਿਲਦਾ ਹੈ।`,
      unknown: "ਮੈਂ ਤੁਹਾਡਾ ਹੁਨਰ ਪੂਰੀ ਤਰ੍ਹਾਂ ਨਹੀਂ ਸਮਝ ਸਕਿਆ, ਕਿਰਪਾ ਕਰਕੇ ਦੁਬਾਰਾ ਦੱਸੋ।",
      lead: " ਤੁਹਾਡੇ ਲਈ ਸੁਝਾਈ ਟ੍ਰੇਨਿੰਗ: ",
      programName: (r) => r.nameHindi ?? r.name,
    },
    or: {
      found: `ଆପଣଙ୍କ କୌଶଳ ${skillList} (NSQF ସ୍ତର ${nsqfLevel}) ସହିତ ମେଳ ଖାଉଛି।`,
      unknown: "ଆପଣଙ୍କ କୌଶଳକୁ ପୂରାପୁରି ବୁଝିପାରିଲି ନାହିଁ, ଦୟାକରି ପୁଣି କହନ୍ତୁ।",
      lead: " ଆପଣଙ୍କ ପାଇଁ ସୁପାରିଶିତ ପ୍ରଶିକ୍ଷଣ: ",
      programName: (r) => r.nameHindi ?? r.name,
    },
  };
  const t = copy[lang] ?? copy.en;
  const base = known.length > 0 ? t.found : t.unknown;
  if (recs.length === 0) return base;
  const list = recs
    .slice(0, 3)
    .map((r, i) => `${i + 1}. ${t.programName(r)} — ${r.rationale}`)
    .join(" ");
  return base + t.lead + list;
}
