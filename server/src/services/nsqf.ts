import { prisma } from "../lib/prisma.js";
import { extractSkills } from "./skillLexicon.js";

export interface MappingResult {
  rawSkillText: string;
  normalizedSkill: string;
  nsqfQualificationId: string | null;
  qpCode: string | null;
  title: string | null;
  sector: string | null;
  nsqfLevel: number | null;
  confidence: number;
  method: "keyword" | "embedding" | "llm" | "manual";
}

/**
 * Map a raw transcript to NSQF qualifications.
 *
 * Strategy (transparent, offline-capable):
 *  1. Pull normalized skill tokens from the lexicon.
 *  2. For each token, find the NsqfQualification whose `keywords` array contains it.
 *  3. Confidence = keyword overlap ratio, capped at 0.95 so nothing looks certain.
 */
export async function mapTranscriptToNsqf(transcript: string): Promise<MappingResult[]> {
  const tokens = extractSkills(transcript);
  if (tokens.length === 0) {
    return [
      {
        rawSkillText: transcript,
        normalizedSkill: "unknown",
        nsqfQualificationId: null,
        qpCode: null,
        title: null,
        sector: null,
        nsqfLevel: null,
        confidence: 0,
        method: "keyword",
      },
    ];
  }

  const quals = await prisma.nsqfQualification.findMany();
  const results: MappingResult[] = [];

  for (const token of tokens) {
    const match = quals.find((q) =>
      q.keywords.map((k) => k.toLowerCase()).includes(token.toLowerCase()),
    );

    if (!match) {
      results.push({
        rawSkillText: transcript,
        normalizedSkill: token,
        nsqfQualificationId: null,
        qpCode: null,
        title: null,
        sector: null,
        nsqfLevel: null,
        confidence: 0.2,
        method: "keyword",
      });
      continue;
    }

    const transcriptHits = match.keywords.filter((k) =>
      transcript.toLowerCase().includes(k.toLowerCase()),
    ).length;
    const confidence = Math.min(0.55 + 0.1 * transcriptHits, 0.95);

    results.push({
      rawSkillText: transcript,
      normalizedSkill: token,
      nsqfQualificationId: match.id,
      qpCode: match.qpCode,
      title: match.title,
      sector: match.sector,
      nsqfLevel: match.nsqfLevel,
      confidence,
      method: "keyword",
    });
  }

  return results;
}
