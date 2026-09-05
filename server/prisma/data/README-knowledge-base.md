# RAG knowledge base

`knowledge-chunks.json` — **177 real passages**, extracted and chunked from
2 real government PDFs, for `POST /api/assistant/ask` (services/rag.ts,
services/knowledge.ts). This exists for questions the structured tables
(`NsqfQualification`, `PmajayCourse`, `TrainingProgram`) can't answer, because
the answer lives in prose policy documents, not a database row — e.g. "what
benefits does PM-AJAY give for beekeeping?", "will I get a certificate?",
"how do I apply?".

## The documents

| Document | Source | Pages | Chunks |
|---|---|---|---|
| PM-AJAY Scheme Guidelines (May 2023, revised) | [pmajay.dosje.gov.in](https://pmajay.dosje.gov.in/Writereaddata/Guidelines_PM-Ajay_may2023.pdf) | 43 | 87 |
| National Skills Qualification Framework (NSQF) 2023 — Gazette Notification | [nqr.gov.in](https://www.nqr.gov.in/downloads/pdfs/NSQF_Gazette_Notification.pdf) | 40 | 90 |

Both fetched with a single `curl` request each (server-rendered/static PDFs,
no scraping needed) and text-extracted with `pdf-parse`. Every chunk is real
text from the source PDF — nothing summarized or rewritten at ingestion time
(the LLM only rewrites at *answer* time, from the retrieved chunks — see
`services/rag.ts`).

## What was searched for but not included

- **PM-DAKSH's own guidelines PDF** (`pmdaksh.dosje.gov.in/assets/uploads/Guidelines.pdf`)
  — found via search, but that entire subdomain times out on every fetch
  attempt (tried plain `curl`, a browser user-agent, and a 45s timeout). This
  would have been the most direct source for skill-development-specific
  certification/enrollment detail; PM-AJAY's own guidelines cover the same
  ground at a higher level instead.
- An earlier February 2022 revision of the PM-AJAY guidelines
  (`socialjustice.gov.in/writereaddata/UploadFile/31121740857806.pdf`) was
  fetched and inspected, then discarded — it's the same document, superseded
  by the May 2023 revision above. Keeping both would risk the retrieval step
  surfacing outdated eligibility/benefit figures.
- A dedicated beneficiary "how to apply" guide doesn't appear to exist as a
  standalone document — per the PM-AJAY guidelines themselves, there's no
  individual online application; beneficiaries are selected by State/District
  selection committees under the Grants-in-Aid component. That's a real,
  honest answer the RAG pipeline will give (it lives in the guidelines PDF,
  chunk-searchable), not a limitation of what was fetched.

## Retrieval + generation

- **Retrieval** (`services/knowledge.ts`): Postgres full-text search
  (`to_tsvector`/`plainto_tsquery`/`ts_rank`) over the `text` column — no
  vector DB or embeddings API needed at this corpus size (177 rows).
- **Generation** (`services/rag.ts`): the top 5 matched chunks are handed to
  Groq (`openai/gpt-oss-120b`) with an explicit instruction to answer *only*
  from those passages, in the beneficiary's language, and to say so plainly
  if the passages don't cover it — never fall back to the model's own general
  knowledge. If `GROQ_API_KEY` isn't configured, the endpoint instead returns
  the single top-ranked passage verbatim (extractive, not generated) rather
  than failing outright.

## Known limitation: lexical search misses vocabulary mismatches

This is keyword search, not semantic search — it can only find a passage if
the question and the passage share actual words (after stemming). Verified
against the exact 3 example questions this was built for:

- **"Mujhe certificate milega?"** ("will I get a certificate?") — works well.
  Retrieves the NSQF gazette's certification/RPL passages and gives an
  accurate, correctly-cited answer.
- **"PM-AJAY mein beekeeping ke liye kya benefits hain?"** — the real answer
  exists (page 38, Annexure-I: "Honey Bee keeping and processing" is an
  explicitly listed fundable activity), but the query's single word
  "beekeeping" never matches the document's two separate words "Bee" +
  "keeping" — different tokens to a lexical index. Confirmed the retrieval
  logic itself is sound by re-querying with "bee keeping benefits" (spaced
  out) — it then ranks the right passage #2. The system said "I don't have
  that information" rather than guessing, which is the correct behavior for
  a failed retrieval, just not the *most* helpful outcome.
- **"Apply kaise karoon?"** ("how do I apply?") — the real answer exists (PM-
  AJAY has no individual application; beneficiaries are chosen by State/
  District selection committees), but the query's only real signal is the
  single word "apply", which appears more densely in the NSQF document (in
  an unrelated "apply for assessment/RPL" sense) than in PM-AJAY's actual
  relevant passages (phrased as "selection committee", "identification of
  beneficiaries" — no shared vocabulary with "apply" at all). Retrieval
  picked the wrong document; the answer was an honest "I don't know", not a
  wrong one.

This is the standard failure mode of keyword-based retrieval and the
textbook reason semantic (embedding-based) search exists — it would catch
"beekeeping" ≈ "bee keeping" and "apply" ≈ "selection process" by meaning,
not spelling. That requires an embeddings API and a vector index, which this
build deliberately doesn't add (matching the project's existing "transparent,
no paid black-box dependency where avoidable" pattern — same reasoning as the
keyword-based skill lexicon). If retrieval quality on real usage turns out to
need it, the fix is additive: keep this full-text search as a cheap first
pass, add an embeddings-based re-ranker on top.

## Regenerating

```bash
# re-fetch a document if its source PDF changes
curl -s <url> -o server/prisma/data/documents/<name>.pdf
npx tsx server/scripts/ingest-documents.ts   # re-chunk everything
npm run db:seed                              # from repo root
```
