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
```

## Enums

| Enum | Values |
|------|--------|
| `Role` | `BENEFICIARY`, `ADMIN` |
| `Language` | `hi en bn ta te mr kn gu pa or` |
| `SessionChannel` | `APP`, `WEB`, `IVR` |
| `RecommendationStatus` | `SUGGESTED → VIEWED → INTERESTED → APPLIED → ENROLLED` (or `REJECTED`) — the admin funnel |

## Tables

### `User`
A beneficiary or an admin. `phone` is the unique login id; `passwordHash` is
bcrypt. Carries `language`, `category` (SC/ST/…, self-declared), and
`state`/`district`/`pincode` used to localise recommendations. Beneficiary rows
can be created implicitly-free (a session may have `userId: null` for anonymous
walk-up use).

### `VoiceSession`
One conversation with the assistant. `rawTranscript` = STT output,
`detectedSkills` = normalized skill tokens found in it, `bandwidthKbps` = measured
client bandwidth (drives the "low-bandwidth sessions" KPI), `channel` = where it
came from. Has many `SkillMapping` and `Recommendation`.

### `NsqfQualification`
A National Skills Qualification Framework qualification pack. `qpCode` (e.g.
`CON/Q0101`) is unique. `keywords: string[]` is the bridge from informal skills —
the mapping engine matches a normalized skill token against this array. `sector`
and `nsqfLevel` (1–10) also feed recommendation scoring. Seeded from
[`server/prisma/seed.ts`](../server/prisma/seed.ts) (19 rows).

### `SkillMapping`
The recorded result of mapping one skill phrase in a session:
`rawSkillText` → `normalizedSkill` → `nsqfQualificationId` (nullable — a
low-confidence match is stored with a null qualification and flagged for
counsellor review). `confidence` 0–1, `method` = `keyword|embedding|llm|manual`.

### `TrainingProgram`
A PM-AJAY / partner skilling programme. Linked to an `NsqfQualification`.
Location (`state`/`district`), `mode` (`OFFLINE|ONLINE|HYBRID`), `durationWeeks`,
`stipend`, `seatsTotal`/`seatsAvailable`, `contactPhone`, `eligibilityNote`,
`component` (`Adarsh Gram | GIA | Hostel | Skill Development`). `active` gates
visibility. Seeded with 12 rows; admins can add more via the API.

### `Recommendation`
A programme proposed to a beneficiary in a session. `score` 0–1 (see the weighting
in [`server/src/services/recommend.ts`](../server/src/services/recommend.ts)),
`rationale` = templated "why this" sentence in the user's language, `status` =
the funnel enum. The website's dashboard aggregates these.

## Seeded demo data

| What | Count | Where |
|------|-------|-------|
| NSQF qualifications | 19 | `seed.ts` `NSQF[]` |
| PM-AJAY programmes | 12 | `seed.ts` `programs[]` |
| Admin user | `9999900000` / `admin123` | `seed.ts` |
| Beneficiary user | `9000000001` / `demo123` | `seed.ts` |

`npm run db:seed` is idempotent (upserts) — safe to re-run.

## Inspecting the DB

```bash
npm --prefix server exec prisma studio    # GUI at localhost:5555
```
