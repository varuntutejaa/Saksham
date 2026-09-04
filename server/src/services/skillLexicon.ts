/**
 * Maps informal / traditional-occupation skill phrases — as people actually say
 * them in native languages (often transliterated by an STT engine) — to a
 * normalized skill token. The normalized token is then matched against
 * NsqfQualification.keywords to find the formal NSQF qualification.
 *
 * This is deliberately a transparent, editable lexicon so the mapping is
 * explainable to auditors and can be extended by domain experts without code.
 */

export interface LexiconEntry {
  normalized: string;
  /** substrings (lowercased, transliteration-tolerant) that indicate this skill */
  patterns: string[];
}

export const SKILL_LEXICON: LexiconEntry[] = [
  {
    normalized: "pottery",
    patterns: [
      "mitti ke bartan", "matka", "kumhar", "pottery", "clay pot", "ghara",
      "मिट्टी के बर्तन", "मटका", "कुम्हार", "chak", "potter",
    ],
  },
  {
    normalized: "tailoring",
    patterns: [
      "silai", "silaai", "kapda silna", "darzi", "tailor", "stitching",
      "sewing", "सिलाई", "दर्जी", "blouse", "kurta silna",
    ],
  },
  {
    normalized: "handloom-weaving",
    patterns: [
      "bunkar", "kapda bunna", "handloom", "weaving", "julaha", "loom",
      "बुनकर", "बुनाई", "saree bunna", "chadar bunna",
    ],
  },
  {
    normalized: "leatherwork",
    patterns: [
      "chamda", "chamar", "jooti banana", "leather", "cobbler", "mochi",
      "चमड़ा", "मोची", "shoe making", "footwear",
    ],
  },
  {
    normalized: "carpentry",
    patterns: [
      "badhai", "lakdi ka kaam", "carpenter", "furniture banana", "wood work",
      "बढ़ई", "लकड़ी", "carpentry",
    ],
  },
  {
    normalized: "masonry",
    patterns: [
      "raj mistri", "mistri", "diwar banana", "mason", "masonry", "construction",
      "राज मिस्त्री", "मिस्त्री", "brick", "plaster",
    ],
  },
  {
    normalized: "agriculture",
    patterns: [
      "kheti", "kisan", "farming", "fasal", "khet", "agriculture", "farmer",
      "खेती", "किसान", "फसल", "crop",
    ],
  },
  {
    normalized: "dairy-livestock",
    patterns: [
      "pashu palan", "gaay bhains", "doodh", "dairy", "cattle", "livestock",
      "पशुपालन", "दूध", "goat", "bakri palan",
    ],
  },
  {
    normalized: "beautician",
    patterns: [
      "parlour", "beauty parlour", "mehndi", "beautician", "salon",
      "पार्लर", "मेहंदी",
    ],
  },
  {
    normalized: "food-processing",
    patterns: [
      "achaar", "papad", "pickle", "food banana",
      "अचार", "पापड़", "catering", "halwai", "sweets", "namkeen",
    ],
  },
  {
    normalized: "electrical",
    patterns: [
      "bijli ka kaam", "electrician", "wiring", "bijli mistri", "electrical",
      "बिजली", "इलेक्ट्रीशियन", "motor repair",
    ],
  },
  {
    normalized: "plumbing",
    patterns: [
      "plumber", "nal ka kaam", "paip", "pipe fitting", "plumbing",
      "प्लंबर", "नल",
    ],
  },
  {
    normalized: "welding",
    patterns: [
      "welding", "welder", "loha jodna", "gate banana",
      "वेल्डिंग", "grill banana",
    ],
  },
  {
    normalized: "mobile-repair",
    patterns: [
      "mobile repair", "phone thik karna", "mobile theek", "handset repair",
      "मोबाइल रिपेयर",
    ],
  },
  {
    normalized: "driving",
    patterns: [
      "driver", "gaadi chalana", "driving", "auto chalana", "taxi",
      "ड्राइवर", "गाड़ी चलाना",
    ],
  },
  {
    normalized: "handicraft-bamboo",
    patterns: [
      "baans", "bamboo", "tokri banana", "basket", "cane", "handicraft",
      "बांस", "टोकरी", "jute craft",
    ],
  },
  {
    normalized: "embroidery",
    patterns: [
      "kadhai", "embroidery", "zari", "zardozi", "kaam wala kapda",
      "कढ़ाई", "जरी",
    ],
  },
  {
    normalized: "housekeeping",
    patterns: [
      "safai", "ghar ka kaam", "housekeeping", "cleaning", "domestic work",
      "सफाई", "jhadu pocha",
    ],
  },
  {
    normalized: "healthcare-support",
    patterns: [
      "asha", "anganwadi", "nurse", "patient care", "dai", "midwife",
      "आशा", "आंगनवाड़ी", "ward boy", "home nursing",
    ],
  },
  {
    normalized: "retail",
    patterns: [
      "dukan", "shop", "kirana", "retail", "sales", "billing",
      "दुकान", "किराना", "salesman",
    ],
  },

  // ── Agriculture (expanded) ─────────────────────────────────────────────
  {
    normalized: "poultry",
    patterns: ["murgi palan", "poultry farm", "chicken farm", "अंडे का व्यापार", "मुर्गी पालन", "poultry"],
  },
  {
    normalized: "horticulture",
    patterns: ["bagwani", "phal ki kheti", "sabzi ki kheti", "nursery", "बागवानी", "horticulture", "nursery ka kaam"],
  },
  {
    normalized: "fisheries",
    patterns: ["machli palan", "matsya palan", "fish farming", "मछली पालन", "fisheries"],
  },
  {
    normalized: "beekeeping",
    patterns: ["madhumakhi palan", "shahad", "honey farming", "मधुमक्खी पालन", "beekeeping"],
  },
  {
    normalized: "sericulture",
    patterns: ["resham keet palan", "silk farming", "sericulture", "रेशम पालन", "रेशम कीट"],
  },

  // ── Handicrafts (expanded) ──────────────────────────────────────────────
  {
    normalized: "wood-carving",
    patterns: ["lakdi ki nakkashi", "wood carving", "काष्ठ नक्काशी", "लकड़ी की नक्काशी", "murti lakdi"],
  },
  {
    normalized: "stone-carving",
    patterns: ["patthar ki nakkashi", "stone carving", "पत्थर की नक्काशी", "murti patthar", "sangtarashi"],
  },
  {
    normalized: "metal-craft",
    patterns: ["pital ka kaam", "dhatu shilp", "brass work", "bell metal", "पीतल का काम", "धातु शिल्प"],
  },
  {
    normalized: "carpet-weaving",
    patterns: ["kaleen bunai", "carpet weaving", "galeecha", "कालीन बुनाई", "गलीचा"],
  },
  {
    normalized: "jewellery-making",
    patterns: ["jewellery banana", "sunar", "gehna banana", "jewellery making", "जौहरी", "सुनार", "गहना बनाना"],
  },
  {
    normalized: "pattern-making",
    patterns: ["pattern banana", "cutting master", "pattern making", "कटिंग मास्टर"],
  },
  {
    normalized: "garment-quality-check",
    patterns: ["quality check kapde", "garment checking", "गारमेंट चेकिंग", "क्वालिटी चेकर"],
  },
  {
    normalized: "fabric-dyeing",
    patterns: ["rangai", "kapda rangna", "dyeing", "रंगाई", "कपड़ा रंगना"],
  },
  {
    normalized: "leather-goods",
    patterns: ["chamde ka samaan", "bag banana chamda", "leather bag", "leather goods", "चमड़े का सामान"],
  },
  {
    normalized: "furniture-polishing",
    patterns: ["furniture polish", "polish karna", "फर्नीचर पॉलिश", "पॉलिश का काम"],
  },

  // ── Construction (expanded) ─────────────────────────────────────────────
  {
    normalized: "bar-bending",
    patterns: ["sariya modna", "bar bending", "सरिया मोड़ना", "सरिया बेंडर"],
  },
  {
    normalized: "tile-laying",
    patterns: ["tile lagana", "tiles fitting", "टाइल लगाना", "टाइल फिटिंग"],
  },
  {
    normalized: "house-painting",
    patterns: ["painting ka kaam", "rang rogan", "painter", "पेंटिंग", "रंग रोगन", "भवन पेंटर"],
  },
  {
    normalized: "scaffolding",
    patterns: ["scaffolding", "बांस बल्ली", "स्कैफोल्डिंग"],
  },

  // ── Beauty & Wellness (expanded) ────────────────────────────────────────
  {
    normalized: "hair-styling",
    patterns: ["hair cutting", "hair style", "hair dresser", "naai", "barber", "बाल काटना", "हेयर स्टाइलिस्ट", "नाई"],
  },
  {
    normalized: "makeup-artist",
    patterns: ["makeup", "makeup artist", "मेकअप", "मेकअप आर्टिस्ट"],
  },
  {
    normalized: "spa-therapy",
    patterns: ["spa", "massage therapy", "स्पा", "मसाज थेरेपी"],
  },

  // ── Food (expanded) ──────────────────────────────────────────────────────
  {
    normalized: "bakery",
    patterns: ["bakery", "cake banana", "bread banana", "बेकरी", "केक बनाना", "ब्रेड बनाना"],
  },
  {
    normalized: "dairy-processing",
    patterns: ["paneer banana", "ghee banana", "doodh processing", "पनीर बनाना", "घी बनाना"],
  },
  {
    normalized: "domestic-cooking",
    patterns: ["ghar ka khana", "khana banana", "cooking", "रसोइया", "khana banane ka kaam", "घर का खाना"],
  },
  {
    normalized: "cooking-chef",
    patterns: ["chef", "hotel mein khana", "rasoiya hotel", "khana banana", "cooking", "शेफ", "बावर्ची"],
  },

  // ── Electronics & Power (expanded) ──────────────────────────────────────
  {
    normalized: "ac-repair",
    patterns: ["ac repair", "ac mechanic", "cooling machine", "एसी रिपेयर", "एसी मैकेनिक"],
  },
  {
    normalized: "electronics-repair",
    patterns: ["tv repair", "fridge repair", "electronics repair", "टीवी रिपेयर", "फ्रिज रिपेयर"],
  },
  {
    normalized: "solar-installation",
    patterns: ["solar panel", "surya urja", "solar installation", "सोलर पैनल", "सौर ऊर्जा"],
  },
  {
    normalized: "lineman",
    patterns: ["lineman", "bijli ka khambha", "electric pole", "लाइनमैन"],
  },
  {
    normalized: "house-wiring",
    patterns: ["wiring ka kaam", "ghar ki wiring", "wireman", "वायरिंग", "वायरमैन"],
  },

  // ── Capital Goods (expanded) ─────────────────────────────────────────────
  {
    normalized: "fitter",
    patterns: ["fitter ka kaam", "machine fitting", "फिटर"],
  },
  {
    normalized: "fabrication",
    patterns: ["fabrication", "sheet metal ka kaam", "फैब्रिकेशन", "शीट मेटल"],
  },

  // ── Automotive (expanded) ────────────────────────────────────────────────
  {
    normalized: "two-wheeler-repair",
    patterns: ["bike repair", "scooter mechanic", "do pahiya vahan", "बाइक रिपेयर", "दोपहिया मैकेनिक"],
  },
  {
    normalized: "car-repair",
    patterns: ["car mechanic", "gaadi ka mechanic", "car repair", "कार मैकेनिक"],
  },
  {
    normalized: "car-wash",
    patterns: ["car washing", "gaadi dhona", "car wash", "गाड़ी धोना"],
  },

  // ── Domestic Work (expanded) ─────────────────────────────────────────────
  {
    normalized: "childcare",
    patterns: ["bachon ki dekhbhal", "nanny", "babysitting", "बच्चों की देखभाल"],
  },
  {
    normalized: "elderly-care",
    patterns: ["budhon ki dekhbhal", "elderly care", "बुजुर्गों की देखभाल"],
  },

  // ── Healthcare (expanded) ────────────────────────────────────────────────
  {
    normalized: "pharmacy-assistant",
    patterns: ["medical store", "pharmacy", "dawai dukan", "मेडिकल स्टोर", "दवाई की दुकान"],
  },
  {
    normalized: "phlebotomy",
    patterns: ["khoon nikalna", "blood sample", "phlebotomy", "लैब सैंपल", "खून निकालना"],
  },

  // ── Retail / IT-ITeS / BFSI ──────────────────────────────────────────────
  {
    normalized: "ecommerce-logistics",
    patterns: ["ecommerce packing", "online order packing", "amazon flipkart kaam", "ई-कॉमर्स पैकिंग"],
  },
  {
    normalized: "computer-operator",
    patterns: ["computer chalana", "data entry", "computer operator", "कंप्यूटर ऑपरेटर", "डेटा एंट्री"],
  },
  {
    normalized: "customer-support",
    patterns: ["call center", "customer care", "bpo", "कॉल सेंटर", "ग्राहक सेवा"],
  },
  {
    normalized: "banking-correspondent",
    patterns: ["bank correspondent", "banking sakhi", "बैंक सखी", "बिजनेस कॉरेस्पॉन्डेंट"],
  },
  {
    normalized: "insurance-agent",
    patterns: ["insurance agent", "bima agent", "बीमा एजेंट"],
  },

  // ── Tourism & Hospitality ─────────────────────────────────────────────────
  {
    normalized: "waiter-steward",
    patterns: ["waiter", "steward", "hotel mein serving", "वेटर"],
  },
  {
    normalized: "hotel-housekeeping",
    patterns: ["hotel housekeeping", "hotel safai", "होटल हाउसकीपिंग"],
  },
  {
    normalized: "tour-guide",
    patterns: ["tour guide", "paryatak guide", "गाइड", "पर्यटक गाइड"],
  },

  // ── Logistics / Security ──────────────────────────────────────────────────
  {
    normalized: "warehouse-operations",
    patterns: ["warehouse ka kaam", "godam", "packing warehouse", "गोदाम", "वेयरहाउस"],
  },
  {
    normalized: "delivery-executive",
    patterns: ["delivery boy", "delivery ka kaam", "parcel delivery", "डिलीवरी", "स्विगी ज़ोमैटो"],
  },
  {
    normalized: "forklift-operator",
    patterns: ["forklift", "फोर्कलिफ्ट"],
  },
  {
    normalized: "security-guard",
    patterns: ["security guard", "chowkidar", "watchman", "गार्ड", "चौकीदार"],
  },

  // ── Telecom / Media / Sports / Others ─────────────────────────────────────
  {
    normalized: "telecom-tower",
    patterns: ["mobile tower", "telecom tower", "टावर तकनीशियन", "मोबाइल टावर"],
  },
  {
    normalized: "fiber-installation",
    patterns: ["optical fiber", "internet cable", "broadband installation", "फाइबर केबल", "ब्रॉडबैंड"],
  },
  {
    normalized: "photography",
    patterns: ["photography", "photo khichna", "photographer", "फोटोग्राफी", "फोटोग्राफर"],
  },
  {
    normalized: "fitness-training",
    patterns: ["gym trainer", "fitness trainer", "yoga instructor", "जिम ट्रेनर", "योगा ट्रेनर"],
  },
  {
    normalized: "rubber-processing",
    patterns: ["rubber tapping", "rubber ka kaam", "रबर टैपिंग"],
  },
  {
    normalized: "mining-helper",
    patterns: ["khadan mein kaam", "mining", "खदान"],
  },
  {
    normalized: "lab-technician",
    patterns: ["lab technician", "prayogshala", "lab assistant", "प्रयोगशाला सहायक"],
  },
];

/** Extract normalized skill tokens from a free-text transcript. */
export function extractSkills(transcript: string): string[] {
  const hay = transcript.toLowerCase();
  const found = new Set<string>();
  for (const entry of SKILL_LEXICON) {
    if (entry.patterns.some((p) => hay.includes(p.toLowerCase()))) {
      found.add(entry.normalized);
    }
  }
  return [...found];
}
