# Saksham Data Model

PostgreSQL, accessed only through Prisma. Schema of record:
[`server/prisma/schema.prisma`](../server/prisma/schema.prisma). Regenerate the
client after any schema edit: `npm --prefix server run prisma:generate`; push to
the DB with `npm run db:push` (from repo root).

The **website never touches the database directly** — it only calls the API. This
page is so you understand what the API payloads mean.

```
User ──< VoiceSession ──< SkillMapping >── NsqfQualification ──< TrainingProgram
  │           │                                                        │
  └───────────┴──────────────< Recommendation >───────────────────────┘

PmajayCourse  (not FK-linked — matched to the same normalizedSkill token at
               query time, surfaced as SkillMapping.pmajayVerified)

KnowledgeChunk  (not FK-linked to anything — retrieved by free-text search
                 for POST /api/assistant/ask, independent of the session/
                 skill-mapping pipeline above)
```

## Enums

| Enum | Values |
|------|--------|
| `Role` | `BENEFICIARY`, `ADMIN` |
| `Language` | `hi en bn ta te mr kn gu pa or` |
| `SessionChannel` | `APP`, `WEB`, `IVR`, `WHATSAPP` |
| `RecommendationStatus` | `SUGGESTED → VIEWED → INTERESTED → APPLIED → ENROLLED` (or `REJECTED`) — the admin funnel |

## Tables

### `User`
A beneficiary or an admin. `phone` is the unique login id; `passwordHash` is
bcrypt. Carries `language`, `category` (SC/ST/…, self-declared), and
`state`/`district`/`pincode` used to localise recommendations. Beneficiary rows
can be created implicitly-free (a session may have `userId: null` for anonymous
walk-up use).

`gender`, `age`, `education` (`below_10th|10th|12th|iti_diploma|undergrad|postgrad`)
are filled in by the app's post-signup onboarding screens
(`app/src/app/onboarding/`) via `PATCH /api/auth/profile`, which also flips
`onboarded` to `true`. The app checks that flag right after login/register to
decide whether to route through onboarding or straight to `/main`.

### `VoiceSession`
One conversation with the assistant. `rawTranscript` = STT output,
`detectedSkills` = normalized skill tokens found in it, `bandwidthKbps` = measured
client bandwidth (drives the "low-bandwidth sessions" KPI), `channel` = where it
came from. Has many `SkillMapping` and `Recommendation`.

### `NsqfQualification`
A National Skills Qualification Framework qualification pack. `qpCode` is
unique. `keywords: string[]` is the bridge from informal skills — the mapping
engine matches a normalized skill token against this array. `sector` and
`nsqfLevel` (1–10) also feed recommendation scoring. `notionalHours` and `nqrId`
(the qualification's numeric id on the source site) are extra fields from the
real data, not used by the app logic yet.

Seeded from
[`server/prisma/data/nsqf-qualifications.json`](../server/prisma/data/nsqf-qualifications.json)
— **1,283 real qualification packs**, scraped from India's official
[National Qualification Register](https://www.nqr.gov.in) (nqr.gov.in, run by
NCVET), across 29 livelihood-relevant sectors. Every `qpCode`, `title`,
`sector`, `nsqfLevel`, `notionalHours` and `ssc` is real — see
[`server/prisma/data/README.md`](../server/prisma/data/README.md) for exactly
how it was captured (NQR has no API; the search UI is client-rendered but each
qualification's own detail page is server-rendered, so it was scraped via a
headless browser for the search results and a plain `fetch` per detail page
for the code) and its known gaps (partial sector coverage, no Hindi titles).

Every one of the 1,283 rows has a non-empty `keywords` array, via
[`server/scripts/link-nsqf-keywords.ts`](../server/scripts/link-nsqf-keywords.ts)
(reproducible, re-run whenever the data or lexicon changes) — but only **242
rows** matched a real concept in
[`server/src/services/skillLexicon.ts`](../server/src/services/skillLexicon.ts)
by whole-word title matching, which is what the live voice pipeline
(`extractSkills` → `mapTranscriptToNsqf`) can actually reach today. The other
**1,041 rows** carry a fallback keyword derived from their own title (generic
seniority/grade words stripped) — real and traceable, but not voice-matchable
yet, since `extractSkills` only ever emits one of the lexicon's ~80 fixed
concept names as a token, never an arbitrary title phrase. A lexicon token
with genuinely no matching qualification simply falls through to "no
confident match", same as any other unmapped skill; it doesn't mean the real
qualification doesn't exist, only that this scrape didn't reach it or the
lexicon doesn't have a pattern for it yet.

### `PmajayCourse`
A course/QP code actually eligible for PM-AJAY skilling funding — a separate
real dataset from `NsqfQualification`, not a duplicate of it. Seeded from
[`server/prisma/data/pmajay-courses.json`](../server/prisma/data/pmajay-courses.json)
— **2,366 real rows**, scraped verbatim from the official course catalogue at
[pmajay.dosje.gov.in/CourseList](https://pmajay.dosje.gov.in/CourseList). See
[`server/prisma/data/README-pmajay-courses.md`](../server/prisma/data/README-pmajay-courses.md)
for provenance and, importantly, what this data *isn't*: a list of scheduled
training batches. No central government source publishes seat/contact/date
data for specific batches — that's handled at the state/district level — so
this only makes the *course* half of the picture real; see `TrainingProgram`
below for what's still illustrative.

`keywords: string[]` (871 of 2,366 rows) links courses to the same
normalized-skill tokens `NsqfQualification` uses, populated by
[`server/scripts/link-pmajay-keywords.ts`](../server/scripts/link-pmajay-keywords.ts)
via whole-word title matching (not substring — see that file's comment on a
real false-positive it fixes). This feeds `pmajayVerified` below.

### `KnowledgeChunk`
A retrievable passage for the RAG pipeline behind `POST /api/assistant/ask` —
answers policy/FAQ questions ("what benefits does PM-AJAY give for
beekeeping?", "will I get a certificate?", "how do I apply?") that the
structured tables above can't, because the answer lives in prose government
guidelines, not a database row. Seeded from
[`server/prisma/data/knowledge-chunks.json`](../server/prisma/data/knowledge-chunks.json)
— **177 real passages** extracted from 2 real PDFs (PM-AJAY scheme
guidelines, the NSQF gazette notification); see
[`server/prisma/data/README-knowledge-base.md`](../server/prisma/data/README-knowledge-base.md)
for exactly which documents, why others (PM-DAKSH's own guidelines) couldn't
be fetched, and how to regenerate. Retrieved by Postgres full-text search
(`server/src/services/knowledge.ts`) — no vector DB or embeddings API needed
at this corpus size — then an LLM (Groq) composes a short answer strictly
from the retrieved passages (`server/src/services/rag.ts`), never from its
own general knowledge; if nothing relevant is found it says so plainly
instead of guessing.

### `SkillMapping`
The recorded result of mapping one skill phrase in a session:
`rawSkillText` → `normalizedSkill` → `nsqfQualificationId` (nullable — a
low-confidence match is stored with a null qualification and flagged for
counsellor review). `confidence` 0–1, `method` = `keyword|embedding|llm|manual`.
`pmajayVerified` is a separate, independent signal: true if the same
`normalizedSkill` also has a real PM-AJAY-fundable course in `PmajayCourse` —
it doesn't affect confidence or scoring, it's additional transparency about
whether the skill is backed by two real government sources or one.

### `TrainingProgram`
A PM-AJAY / partner skilling programme. Linked to an `NsqfQualification`.
Location (`state`/`district`), `mode` (`OFFLINE|ONLINE|HYBRID`), `durationWeeks`,
`stipend`, `seatsTotal`/`seatsAvailable`, `contactPhone`, `eligibilityNote`,
`component` (`Adarsh Gram | GIA | Hostel | Skill Development`). `active` gates
visibility. Seeded with 12 rows; admins can add more via the API.

**Data-realness note**: these 12 seed rows are illustrative sample data, not
scraped — confirmed by directly checking the PM-AJAY portal that no central
source publishes district-level batch data (seats, contact, dates) at all.
This is unlike `NsqfQualification` and `PmajayCourse`, which are both real and
traceable. See the same disclaimer in `schema.prisma`'s `TrainingProgram`
comment and the website landing page footer.

### `Recommendation`
A programme proposed to a beneficiary in a session. `score` 0–1 (see the weighting
in [`server/src/services/recommend.ts`](../server/src/services/recommend.ts)),
`rationale` = templated "why this" sentence in the user's language, `status` =
the funnel enum. The website's dashboard aggregates these.

## Seeded demo data

| What | Count | Where |
|------|-------|-------|
| NSQF qualifications | 1,283 real, scraped (29 sectors) | `prisma/data/nsqf-qualifications.json` |
| PM-AJAY programmes | 12 | `seed.ts` `programs[]` |
| Admin user | `9999900000` / `admin123` | `seed.ts` |
| Beneficiary user | `9000000001` / `demo123` | `seed.ts` |

`npm run db:seed` is idempotent (upserts) — safe to re-run.

## Inspecting the DB

```bash
npm --prefix server exec prisma studio    # GUI at localhost:5555
```
