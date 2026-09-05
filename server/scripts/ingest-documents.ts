/**
 * Extracts and chunks the real government PDFs in prisma/data/documents/ into
 * prisma/data/knowledge-chunks.json, for the RAG pipeline (services/rag.ts).
 *
 * Each PDF is split page-by-page, then each page's text is grouped into
 * ~200-word chunks along paragraph boundaries (never mid-sentence where a
 * blank line exists) so a single chunk stays coherent and citable back to a
 * specific page.
 *
 * Run: npx tsx scripts/ingest-documents.ts   (from server/)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PDFParse } from "pdf-parse";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOCS_DIR = path.join(__dirname, "..", "prisma", "data", "documents");
const OUT_PATH = path.join(__dirname, "..", "prisma", "data", "knowledge-chunks.json");

const TARGET_WORDS = 220;

interface SourceDoc {
  file: string;
  documentTitle: string;
  sourceUrl: string;
}

// The two real documents fetched for this RAG pipeline — see
// prisma/data/README-knowledge-base.md for what was searched for and why
// only these two were usable (PM-DAKSH's own guidelines PDF is unreachable —
// pmdaksh.dosje.gov.in times out on every attempt).
const SOURCES: SourceDoc[] = [
  {
    file: "pmajay-guidelines.pdf",
    documentTitle: "PM-AJAY Scheme Guidelines (Ministry of Social Justice & Empowerment, May 2023)",
    sourceUrl: "https://pmajay.dosje.gov.in/Writereaddata/Guidelines_PM-Ajay_may2023.pdf",
  },
  {
    file: "nsqf-gazette-notification.pdf",
    documentTitle: "National Skills Qualification Framework (NSQF) 2023 — Gazette Notification (NCVET)",
    sourceUrl: "https://www.nqr.gov.in/downloads/pdfs/NSQF_Gazette_Notification.pdf",
  },
];

interface Chunk {
  documentTitle: string;
  sourceUrl: string;
  page: number;
  chunkIndex: number;
  text: string;
}

function splitIntoChunks(pageText: string, page: number, documentTitle: string, sourceUrl: string, startIndex: number): Chunk[] {
  const paragraphs = pageText
    .split(/\n{1,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks: Chunk[] = [];
  let buffer: string[] = [];
  let wordCount = 0;
  let chunkIndex = startIndex;

  function flush() {
    if (buffer.length === 0) return;
    chunks.push({ documentTitle, sourceUrl, page, chunkIndex, text: buffer.join(" ") });
    chunkIndex += 1;
    buffer = [];
    wordCount = 0;
  }

  for (const para of paragraphs) {
    const words = para.split(/\s+/).length;
    if (wordCount > 0 && wordCount + words > TARGET_WORDS) flush();
    buffer.push(para);
    wordCount += words;
  }
  flush();
  return chunks;
}

async function main() {
  const allChunks: Chunk[] = [];

  for (const source of SOURCES) {
    const filePath = path.join(DOCS_DIR, source.file);
    const buf = fs.readFileSync(filePath);
    const parser = new PDFParse({ data: buf });
    const result = await parser.getText();
    await parser.destroy();

    let chunkIndex = 0;
    for (const page of result.pages) {
      // strip the "Page N of M" running header pdf-parse picks up
      const cleanText = page.text.replace(/^Page \d+ of \d+\s*/m, "");
      const pageChunks = splitIntoChunks(cleanText, page.num, source.documentTitle, source.sourceUrl, chunkIndex);
      chunkIndex += pageChunks.length;
      allChunks.push(...pageChunks);
    }
    console.log(`${source.file}: ${result.pages.length} pages -> ${chunkIndex} chunks`);
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(allChunks, null, 2));
  console.log("total chunks:", allChunks.length);
  console.log("wrote", OUT_PATH);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
