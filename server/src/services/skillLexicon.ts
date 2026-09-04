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
      "पशुपालन", "दूध", "goat", "bakri palan", "murgi palan", "poultry",
    ],
  },
  {
    normalized: "beautician",
    patterns: [
      "parlour", "beauty parlour", "mehndi", "makeup", "beautician", "salon",
      "पार्लर", "मेहंदी", "hair cutting", "naai", "barber",
    ],
  },
  {
    normalized: "food-processing",
    patterns: [
      "achaar", "papad", "pickle", "food banana", "khana banana", "cooking",
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
      "welding", "welder", "loha jodna", "gate banana", "fabrication",
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
