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
- **`keywords`** (the bridge to `services/skillLexicon.ts`'s voice-mapping
  lexicon) is populated for only ~64 of the 1,283 rows — one qualification per
  lexicon concept, matched by searching real titles for the concept's keyword
  (see `keywordsByDetailId`/`CONCEPT_MATCH` logic, not preserved as a script in
  this repo — redo by title substring search if you need to regenerate it). A
  lexicon token with no match here isn't wrong — the app just returns "no
  confident match" for it, same as any other genuinely unmapped skill. It may
  simply not have been in the sectors/pages this scrape reached.
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
