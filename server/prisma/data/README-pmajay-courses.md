# PM-AJAY course catalogue

`pmajay-courses.json` — **2,366 real course entries**, scraped from the
official PM-AJAY portal's own course catalogue:
<https://pmajay.dosje.gov.in/CourseList> (Department of Social Justice &
Empowerment). Every `courseLevel`, `sector`, `subSector`, `courseName`,
`subCourseCode`, and `subCourseName` is copied verbatim from that page —
nothing fabricated.

## What this is (and isn't)

This is a **course eligibility catalogue** — the list of courses/QP codes
PM-AJAY's Skill Development component will fund — not a list of scheduled
training batches. It answers "is this a real, PM-AJAY-fundable course?", not
"is there a seat open near me right now?". Fields like seats, contact number,
provider, and exact dates for a specific batch are **not published anywhere
centrally by the government** (confirmed by checking the portal directly —
that granularity is handled at the state/district implementing-agency level).
The `TrainingProgram` table's operational fields (seats, `contactPhone`,
district-level scheduling) therefore remain illustrative sample data, same as
before this scrape — see the disclaimer on the website's landing page footer
and `server/CLAUDE.md`. This scrape only replaces the *course* half of the
picture with something real.

## Provenance

The source page (`/CourseList`) is fully server-rendered — all 2,366 rows are
present in the initial HTML in a single `<table id="table4">`; the page's
DataTables plugin only adds client-side sort/search on top, no pagination or
AJAX fetch is needed. Fetched with a single `curl` request, parsed by matching
`<tr>...</tr>` blocks and decoding HTML entities.

## Relationship to `NsqfQualification`

This is a **separate, real dataset** from the 1,283-row NSQF/NQR scrape
(`README.md` in this same folder) — they overlap conceptually (same trades)
but rarely share the same code: PM-AJAY's list uses newer course-code versions
(many end in `-2026-...`), so a direct `subCourseCode` == `qpCode` match only
succeeds for a handful of rows. Cross-checking by title text instead (see
`server/scripts/link-pmajay-keywords.ts`) finds real matches for most of the
skill-lexicon's concepts, so that's the linking method actually used.

## `keywords`

Populated by `server/scripts/link-pmajay-keywords.ts`, which matches each
course's title text (whole-word, not substring — see the comment in that file
about a real false-positive it fixed: "chak", a `pottery` pattern, initially
matched inside "Pan**chak**arma") against `services/skillLexicon.ts`'s
existing lexicon. **871 of the 2,366 rows** (covering **61 of the app's 79
lexicon concepts**) got at least one keyword this way. A concept with zero
PM-AJAY course matches isn't necessarily missing from the real catalogue —
this is a text-matching heuristic against English titles only, so anything
whose course title doesn't share an English keyword with the lexicon's
patterns won't be found even if a matching course exists on the page.

This `keywords` field feeds `services/nsqf.ts`'s `pmajayVerified` flag: for
every skill the app matches to an NSQF qualification, it separately checks
whether that same normalized skill also has a real PM-AJAY-fundable course,
and surfaces that as an independent, traceable "PM-AJAY verified" signal
(`MappingResult.pmajayVerified` / `.pmajayCourse`) — it does not affect NSQF
matching or recommendation scoring, it's purely additional transparency.

## Regenerating

```bash
curl -s https://pmajay.dosje.gov.in/CourseList -o /tmp/pmajay_courselist.html
# then re-run the same <tr> parse used to produce pmajay-courses.json
# (not committed as a script since it's a one-off HTML parse, unlike the
# reusable keyword-linking step)
npx tsx server/scripts/link-pmajay-keywords.ts
npm run db:seed   # from repo root
```
