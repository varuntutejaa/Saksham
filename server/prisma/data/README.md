# NSQF qualification data

`nsqf-qualifications.json` — **1,283 real qualification packs**, scraped from
India's official [National Qualification Register](https://www.nqr.gov.in)
(NQR, run by NCVET), covering 29 sectors relevant to informal/traditional
livelihoods (Agriculture, Handicrafts, Construction, Automotive, Healthcare,
BFSI, IT-ITeS, Tourism & Hospitality, Logistics, Telecom, and more — the full
sector list is whatever appears under `sector` in the file).

## Provenance

NQR has no public API or bulk export — it's a client-rendered search portal.
Data was captured by:
1. Loading each sector's `qualifications-search/<id>` page in a headless
   browser and paging through "VIEW MORE"/"NEXT" to collect every qualification
   card (title, NSQF level, notional hours, and its `nqrId` — the numeric id in
   `nqr.gov.in/qualifications/<nqrId>`).
2. Fetching each qualification's own detail page (server-rendered HTML — a
   plain `fetch`, no browser needed) and extracting its real `qpCode`
   ("NQR Code") and awarding body.

Every `qpCode`, `title`, `sector`, `nsqfLevel`, `notionalHours`, and `ssc` in
this file is real, taken directly from an NQR page — **nothing in this file is
fabricated**. `titleHindi` is `null` throughout — NQR is English-only and no
translation was invented. `nqrId` lets you trace any row back to its source:
`https://www.nqr.gov.in/qualifications/<nqrId>`.

## Known gaps

- **This is a partial scrape, not the whole registry.** NQR has 59 sectors
  total; only ~29 livelihood-relevant ones were pulled, and even within those,
  "VIEW MORE" pagination is inconsistent (some sectors fully loaded, others
  stopped short of their stated total — e.g. Agriculture shows 87 of a stated
  185). Re-running the same scrape would likely surface more. There's no
  dedup/completeness guarantee beyond what's in this file.
- **`keywords`** — every one of the 1,283 rows has a non-empty array, via
  [`server/scripts/link-nsqf-keywords.ts`](../../scripts/link-nsqf-keywords.ts)
  (reproducible; re-run any time this file or the lexicon changes). Two tiers:
  - **242 rows** matched a real concept in `services/skillLexicon.ts` by
    whole-word title matching — these are reachable by the live voice
    pipeline today (`extractSkills` → `mapTranscriptToNsqf`).
  - **The remaining 1,041 rows** fell back to a keyword derived from their
    own title (lowercased, generic seniority/grade words like
    "Assistant"/"Junior"/"Level II" stripped) — real, traceable to the row,
    but **not yet reachable by voice transcript matching**, since
    `extractSkills` only ever emits one of the lexicon's ~80 fixed concept
    names as a token, never an arbitrary title phrase. These exist so no row
    is left with an empty `keywords` array, and as a foundation for a future
    title-search feature — don't mistake them for voice-matchable ones.
  A lexicon token with genuinely no matching qualification isn't wrong — the
  app just returns "no confident match" for it, same as any other unmapped
  skill.
- A handful of `qpCode`s got a `-<nqrId>` suffix appended where NQR itself
  reused the same code across two different qualification ids.

## Regenerating / extending

There's no committed scraper script (it was run ad hoc, not part of the repo).
To pull more sectors or refresh this file: load
`https://www.nqr.gov.in/qualifications-search/<sectorId>` in a headless
browser, click "VIEW MORE" until it's replaced by "NEXT" pagination, extract
`.qualifications__rw.row > div` cards (title/hours/level + the
`/qualifications/<id>` link), then `fetch` each `nqr.gov.in/qualifications/<id>`
detail page directly (it's server-rendered) and regex out the `NQR Code:`
`<span>` and the `Awarding Bodies` `<li>`.
