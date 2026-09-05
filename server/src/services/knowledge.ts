import { prisma } from "../lib/prisma.js";

export interface KnowledgeMatch {
  documentTitle: string;
  sourceUrl: string;
  page: number;
  text: string;
  rank: number;
}

/**
 * Retrieval step of the RAG pipeline — Postgres full-text search over
 * KnowledgeChunk, no vector DB or embeddings API needed at this corpus size
 * (177 chunks from 2 documents).
 *
 * Deliberately OR's the question's words together (`to_tsquery` with `|`),
 * not `plainto_tsquery`'s implicit AND — a real free-text question like
 * "what benefits does PM-AJAY give for bee keeping?" needs every one of
 * "benefits"/"pm-ajay"/"bee"/"keeping" to co-occur in the SAME ~200-word
 * chunk to satisfy an AND query, which real passages rarely do (the actual
 * answer here — "Honey Bee keeping and processing" — sits in a bullet list
 * that never repeats the scheme name or the word "benefits"). `ts_rank`
 * still scores chunks matching more/rarer terms higher, so OR doesn't lose
 * precision, it just stops requiring an unrealistic full-phrase match.
 */
export async function searchKnowledge(question: string, limit = 5): Promise<KnowledgeMatch[]> {
  const terms = question
    .toLowerCase()
    .normalize("NFC")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3);
  if (terms.length === 0) return [];
  const orQuery = terms.join(" | ");

  return prisma.$queryRaw<KnowledgeMatch[]>`
    SELECT "documentTitle", "sourceUrl", page, text,
      ts_rank(to_tsvector('english', text), to_tsquery('english', ${orQuery})) AS rank
    FROM "KnowledgeChunk"
    WHERE to_tsvector('english', text) @@ to_tsquery('english', ${orQuery})
    ORDER BY rank DESC
    LIMIT ${limit}
  `;
}
