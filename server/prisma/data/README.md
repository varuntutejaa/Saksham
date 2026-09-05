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

## Full detail pages (`nsqf-details.json`)

`nsqf-details.json` — **all 1,283 qualifications' complete NQR detail pages**,
keyed by `nqrId`, produced by
[`scripts/scrape-nsqf-details.ts`](../../scripts/scrape-nsqf-details.ts)
(re-runnable and resumable; `npm run scrape:nsqf-details`, then
`npm run apply:nsqf-details` to load it onto the rows).

The original pass fetched these same URLs but kept only `qpCode` and `ssc`.
This captures the rest of the page — every field verbatim, nothing inferred:

| Field | Coverage |
|---|---|
| `jobDescription` (the NQR "Job Description" prose) | 1,283 / 1,283 |
| `eligibility` — entry education, field, experience, prior training | 1,283 |
| `proposedOccupations` — job titles the qualification leads to | 1,283 |
| `progressionPathway` — vertical / horizontal / academic next steps | 1,283 |
| `validTill` + `approvedOn` + `nsqcNumber` | 1,283 |
| `nos` — the syllabus: code, mandatory/optional, hours, credits, level | 1,268 |
| `theoryHours` / `practicalHours` / `employabilityHours` / `ojtHours` | 1,281 |
| `notionalHoursMin` / `notionalHoursMax` | 1,283 |
| `awardingBodies`, `certifyingBodies`, `organisationType` | 1,283 |
| `qualificationType`, `applicability` (STT/RPL) | 1,283 |

### Expiry — 464 of 1,283 are no longer valid

NQR qualifications carry a `Valid Till` date and **they genuinely expire**. As
of this scrape **464 of the 1,283 rows (36%) are past their validity date** and
only **819 are live**. Recommending an expired qualification would be wrong, so
`NsqfQualification.expired` is set at seed time and:

- `services/nsqf.ts` never maps a spoken skill onto an expired qualification;
- `GET /api/nsqf` hides them unless you pass `?includeExpired=true`.

Re-run the scrape to refresh — expiry is a moving target, not a fixed fact.

### `minEducation`

`eligibility` is a list of alternative entry routes ("10th, in any field, 2
years' experience" / "12th, completed, no experience"), and meeting **any one**
of them qualifies a candidate. `apply-nsqf-details.ts` therefore denormalizes
the *lowest* bar across the rows into `minEducation`, mapped onto the same
ladder the app collects during voice onboarding
(`below_10th | 10th | 12th | iti_diploma | undergrad | postgrad`), so
"can this beneficiary actually enrol?" is answerable. Rows whose only entry
route is "Previous NSQF qualification" get `null` — that is a prior-learning
route, not a school level.

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
