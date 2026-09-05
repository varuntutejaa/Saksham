# Saksham Backend API

Base URL: `http://localhost:4000` (dev) — the website reads it from
`NEXT_PUBLIC_API_URL`.

All responses are JSON. All request bodies are JSON unless noted. CORS is open
(`*`) in dev.

The website's typed client for every call below lives in
[`website/lib/api.ts`](../website/lib/api.ts) — **use it, don't hand-roll
`fetch`.** If you need a new endpoint, add it there and coordinate a matching
change in `server/` (see [ARCHITECTURE.md](./ARCHITECTURE.md)).

---

## Auth

JWT bearer tokens. `POST /api/auth/login` → `{ token }`. Send it as
`Authorization: Bearer <token>` on admin routes. Tokens last 30 days. The website
stores the token in `localStorage` under `saksham.admin.token`
([`website/lib/auth.ts`](../website/lib/auth.ts)).

### `POST /api/auth/login`
```jsonc
// request
{ "phone": "9999900000", "password": "admin123" }
// 200
{ "token": "eyJ...", "user": { "id": "...", "role": "ADMIN", "name": "Admin (MoSJE)", ... } }
// 401 { "error": "Invalid credentials" }
```

### `POST /api/auth/register`
```jsonc
{ "phone": "9000000123", "password": "secret", "name": "Sita",
  "language": "hi", "role": "BENEFICIARY", "state": "Bihar", "district": "Patna" }
// 201 { "token", "user }   · 409 if phone taken
```

### `GET /api/auth/me`  *(bearer)*
`200 { "user": { ... } }`

### `PATCH /api/auth/profile`  *(bearer)*
Fills in the post-signup onboarding questions (gender/age/education) asked by
the app right after login/register. All fields optional so each of the three
onboarding screens can call it incrementally, or send all three + `onboarded`
at once (what the app actually does, on the last screen).
```jsonc
// request
{ "gender": "female", "age": 30, "education": "undergrad", "onboarded": true }
// 200 { "user": { ...gender, age, education, onboarded... } }
```
`gender`: `male|female|other`. `education`: `below_10th|10th|12th|iti_diploma|undergrad|postgrad`.

---

## Assistant (the core pipeline)

### `POST /api/assistant/converse`
The whole voice flow in one call: speech/text → NSQF mapping → real PM-AJAY
course recommendations → spoken reply. Accepts **either** JSON with a `transcript`
**or** `multipart/form-data` with an `audio` file (same field names).

```jsonc
// request (JSON form)
{
  "transcript": "main raj mistri hoon, diwar aur plaster ka kaam",
  "language": "hi",              // hi|en|bn|ta|te|mr|kn|gu|pa|or  (default hi)
  "state": "Rajasthan",          // optional, improves ranking
  "district": "Jaipur",          // optional, improves ranking
  "userId": "clx...",            // optional, links session to a user
  "channel": "WEB",              // APP|WEB|IVR|WHATSAPP (default APP)
  "bandwidthKbps": 128           // optional, for low-bandwidth analytics
}
```
```jsonc
// 200
{
  "sessionId": "cmtm...",
  "transcript": "main raj mistri hoon, diwar aur plaster ka kaam",
  "stt": { "provider": "mock", "confidence": 0.82 },   // only when audio was sent
  "mappings": [
    { "rawSkillText": "...", "normalizedSkill": "masonry",
      "nsqfQualificationId": "cmt...", "qpCode": "CON/Q0101",
      "title": "Assistant Mason", "sector": "Construction",
      "nsqfLevel": 3, "confidence": 0.55, "method": "keyword",
      "pmajayVerified": true,
      "pmajayCourse": { "subCourseCode": "CON/Q1105", "subCourseName": "Masonry & Concrete Work", "sector": "Construction" } }
  ],
  "recommendations": [
    { "recommendationId": "cmt...", "pmajayCourseId": "cmt...",
      "subCourseCode": "CON/Q0103", "subCourseName": "Mason General",
      "courseName": "Construction", "sector": "Construction",
      "subSector": "Masonry", "courseLevel": "National",
      "nsqfQpCode": "CON/Q0101", "nsqfTitle": "Assistant Mason", "nsqfLevel": 3,
      "score": 0.95, "rationale": "यह सुझाया गया क्योंकि ..." }
  ],
  "reply": { "text": "आपका हुनर Assistant Mason ...", "audioUrl": "data:text/plain;...", "format": "text" }
}
```
Notes:
- **Recommendations are real PM-AJAY courses**, scored out of the 2,366-row
  government catalogue (`PmajayCourse`) against the NSQF qualification the
  spoken skill mapped to — both halves of a recommendation are real, traceable
  data. `nsqfQpCode`/`nsqfTitle`/`nsqfLevel` carry that qualification so the
  match stays auditable. Scoring: keyword hit 0.50, sector match 0.20, title
  names the trade 0.15, nationally available or in the beneficiary's state
  0.10, mapped to a QP at all 0.05.
- If nothing maps, `mappings` has one entry with `normalizedSkill: "unknown"` and
  `recommendations` is empty.
- `reply.format` is `"text"` from the mock engine — clients speak it with
  on-device TTS. With Bhashini keys set it becomes a real audio URL.
- `pmajayVerified`/`pmajayCourse` are independent of the NSQF match — they say
  whether this `normalizedSkill` also has a real, currently PM-AJAY-fundable
  course (`PmajayCourse`, scraped from pmajay.dosje.gov.in/CourseList — see
  `server/prisma/data/README-pmajay-courses.md`). They don't affect scoring.

### `POST /api/assistant/ask`
RAG: answers a free-text policy/FAQ question from real government documents
(PM-AJAY guidelines, NSQF gazette notification — see
`server/prisma/data/README-knowledge-base.md`), not the structured tables.
For questions the skill-mapping pipeline above can't answer.
```jsonc
// request
{ "question": "PM-AJAY mein beekeeping ke liye kya benefits hain?", "language": "hi" }
// 200
{
  "answer": "PM-AJAY ... [1]",
  "sources": [
    { "documentTitle": "PM-AJAY Scheme Guidelines (Ministry of Social Justice & Empowerment, May 2023)",
      "sourceUrl": "https://pmajay.dosje.gov.in/Writereaddata/Guidelines_PM-Ajay_may2023.pdf", "page": 12 }
  ],
  "grounded": true
}
```
Notes:
- `grounded: false` means nothing relevant was found at all — `answer` is then
  a fixed "I don't have that information" reply in the requested language, not
  a guess.
- With no `GROQ_API_KEY` configured, `answer` is the single top-ranked real
  passage verbatim (extractive) instead of an LLM-composed sentence — still
  real, just not synthesized into a direct reply.
- Not persisted anywhere (no session/mapping created) — this is a stateless
  lookup, unlike `/converse`.

### `POST /api/assistant/extract-profile-answer`
Voice onboarding: turns one free-text answer (spoken or typed, any language)
into the structured profile value it maps to.
```jsonc
// request
{ "field": "age", "answer": "main tees saal ka hoon", "language": "hi" }
// 200
{ "value": 30 }   // string for name/gender/education, number for age, null if unclear
```
`value: null` means the answer couldn't be classified — the app re-asks rather
than guessing. With no `GROQ_API_KEY`, only `age` resolves (regex); the rest
return `null`.

### `POST /api/assistant/tts`
Sarvam text-to-speech (`bulbul:v3`) for the voice agent and onboarding prompts.
```jsonc
// request
{ "text": "नमस्ते, मैं साक्षम हूं", "language": "hi" }   // text: 1–1500 chars
// 200
{ "audioUrl": "data:audio/wav;base64,UklGR...", "format": "wav", "provider": "sarvam" }
```
With no `SARVAM_API_KEY` (or on a Sarvam error) it returns
`{ "audioUrl": "data:text/plain;...", "format": "text", "provider": "mock" }`
and the client speaks the text with its on-device engine instead.

### `PATCH /api/assistant/recommendations/:id`
Advance the funnel when a beneficiary acts on a recommendation.
```jsonc
{ "status": "INTERESTED" }  // SUGGESTED|VIEWED|INTERESTED|APPLIED|ENROLLED|REJECTED
// 200 <updated recommendation>   · 404 if id unknown
```

---

## Google Stitch (admin bearer, server-side key)

Google Stitch generates UI designs from natural-language prompts. The server
keeps Stitch credentials out of app/website bundles and returns Stitch screen
asset URLs. `GET /api/stitch/status` is public; the project and screen routes
require an ADMIN bearer token so a public client cannot spend Stitch quota.
Use `STITCH_ACCESS_TOKEN` + `GOOGLE_CLOUD_PROJECT` for OAuth generation; keep
`STITCH_API_KEY` only if your Stitch account supports key auth for the operation.
Without usable Stitch credentials, project and screen routes return `503`.

### `GET /api/stitch/status`
```jsonc
// 200
{
  "configured": true,
  "authMode": "oauth",
  "googleCloudProject": "my-gcp-project",
  "defaultProjectId": "4044680601076201931"
}
```

### `POST /api/stitch/projects`
Creates a Stitch project.
```jsonc
// request
{ "title": "Saksham App Redesign" }
// 201
{ "projectId": "4044680601076201931", "id": "4044680601076201931", "title": "Saksham App Redesign" }
```

### `GET /api/stitch/projects`
Lists projects accessible to the configured Stitch key. Requires admin bearer.
```jsonc
[
  { "projectId": "4044680601076201931", "id": "4044680601076201931", "title": "Saksham App Redesign" }
]
```

### `POST /api/stitch/screens`
Generates one screen. Requires admin bearer. If `projectId` is omitted, the server uses
`STITCH_PROJECT_ID`; if that is also unset, it creates a new project using
`projectTitle` or `Saksham Stitch Designs`.
```jsonc
// request
{
  "prompt": "A mobile onboarding screen for Saksham in Hindi with a language picker",
  "projectId": "4044680601076201931",
  "deviceType": "MOBILE",      // MOBILE|DESKTOP|TABLET|AGNOSTIC
  "modelId": "GEMINI_3_FLASH", // optional
  "includeAssets": true        // default true
}
// 201
{
  "projectId": "4044680601076201931",
  "screenId": "5828011220123456789",
  "htmlUrl": "https://...",
  "imageUrl": "https://..."
}
```

### `GET /api/stitch/projects/:projectId/screens`
Lists screens in a project. Add `?includeAssets=true` to resolve HTML and
screenshot URLs for each screen.

### `GET /api/stitch/projects/:projectId/screens/:screenId`
Gets one screen. `includeAssets` defaults to `true`.

## Catalog (public, no auth)

### `POST /api/nsqf/map`
Map free text to NSQF qualifications **without persisting** anything. This powers
the website's landing-page "try the skill mapper" widget.
```jsonc
// request
{ "text": "silai aur kadhai ka kaam" }
// 200
[ { "normalizedSkill": "tailoring", "qpCode": "AMH/Q1947",
    "title": "Self Employed Tailor", "sector": "Apparel, Made-ups & Home Furnishing",
    "nsqfLevel": 4, "confidence": 0.55, "method": "keyword",
    "rawSkillText": "silai aur kadhai ka kaam", "nsqfQualificationId": "cmt...",
    "pmajayVerified": true,
    "pmajayCourse": { "subCourseCode": "RSETI/217", "subCourseName": "Sewing Machine Servicing & Repair", "sector": "RSETI" } } ]
```

**Every list endpoint below is paginated the same way** — the catalogues are too
large to send whole (1,283 NSQF QPs, 2,366 PM-AJAY courses). Query `?page=1&pageSize=5`
(`pageSize` max 50, default 5); the response is always:
```jsonc
{ "items": [ ... ], "total": 1283, "page": 1, "pageSize": 5, "totalPages": 257 }
```

### `GET /api/nsqf`
NSQF qualifications. Query: `?sector=Construction&level=3&q=mason&page=&pageSize=`.

**Expired qualifications are excluded by default.** NQR qualifications carry a
`Valid Till` date and 464 of the 1,283 have passed it — pass
`?includeExpired=true` to see them anyway.
```jsonc
{ "items": [ { "id", "qpCode": "CON/Q0101", "title": "Assistant Mason", "titleHindi",
    "sector": "Construction", "nsqfLevel": 3, "ssc",
    "description": "The individual lays bricks…",       // NQR "Job Description"
    "notionalHours": 300, "notionalHoursMin": 300, "notionalHoursMax": 300,
    "theoryHours": 60, "practicalHours": 120, "employabilityHours": 0, "ojtHours": "120",
    "eligibility": [ { "criteria1": "10th", "criteria2": "In any field",
                      "experience": "2 years", "trainingQualification": "None" } ],
    "minEducation": "10th",                              // lowest bar across those rows
    "proposedOccupations": ["Mason", "Field Worker"],    // job titles it leads to
    "progressionPathway": ["Vertical - Mason Trainer", "Academic: Diploma in Civil"],
    "nos": [ { "title", "code", "mandatory", "hours", "credits", "level" } ],
    "nsqcNumber": "26", "approvedOn": "2022-05-26T00:00:00.000Z",
    "validTill": "2025-05-26T00:00:00.000Z", "expired": false,
    "awardingBodies": ["…"], "certifyingBodies": ["…"], "organisationType": "Sector Skill Council",
    "qualificationType": "General Qualification", "applicability": "STT",
    "keywords": ["masonry"] } ], "total": 819, ... }
```
Everything from `description` down is scraped verbatim from that qualification's
own NQR page (`nqr.gov.in/qualifications/<nqrId>`) — see
`server/prisma/data/README.md`.

### `GET /api/nsqf/filters`
The filter values that actually exist, for the app's filter chips.
```jsonc
{ "sectors": ["Agriculture", "Apparel", ...], "levels": [1,2,3,4,5,6,7] }
```

### `GET /api/pmajay-courses`
The real PM-AJAY course catalogue (`server/prisma/data/README-pmajay-courses.md`).
Query: `?sector=&courseLevel=&q=&page=&pageSize=`.
```jsonc
{ "items": [ { "id", "srNo", "courseLevel": "National", "sector": "Apparel",
    "subSector", "courseName", "subCourseCode": "AMH/Q1947",
    "subCourseName": "Self Employed Tailor", "keywords": ["tailoring"] } ],
  "total": 2366, ... }
```

### `GET /api/pmajay-courses/filters`
```jsonc
{ "sectors": ["Aerospace and Aviation", ...],
  "courseLevels": ["National", "State [ODISHA]", "State [PUNJAB]"] }
```

### `GET /api/programs`
Active PM-AJAY training programmes. Query: `?state=&district=&sector=&q=&page=&pageSize=`.
```jsonc
{ "items": [ { "id", "name", "nameHindi", "scheme": "PM-AJAY", "component": "GIA",
    "providerName", "sector", "nsqfLevel", "mode": "OFFLINE",
    "durationWeeks", "stipend": true, "certification", "state", "district",
    "address", "contactPhone", "seatsTotal", "seatsAvailable",
    "eligibilityNote", "active": true, "nsqfQualification": { ... } } ],
  "total": 12, ... }
```

### `GET /api/programs/filters`
```jsonc
{ "sectors": ["Agriculture", "Construction", ...] }
```

### `GET /api/programs/:id`
Single programme (not paginated — one object). `404` if unknown.

---

## Admin (bearer token, `role: ADMIN`)

### `GET /api/admin/stats`
Headline numbers for the dashboard.
```jsonc
{
  "totals": { "sessions": 42, "beneficiaries": 30, "recommendations": 180,
              "lowBandwidthSessions": 12 },
  "funnel": { "suggested": 180, "viewed": 90, "interested": 40,
              "applied": 15, "enrolled": 6, "conversionRate": 0.033 },
  "byStatus":   [ { "status": "SUGGESTED", "_count": 120 }, ... ],
  "byLanguage": [ { "language": "hi", "_count": 28 }, ... ],
  "topSkills":  [ { "normalizedSkill": "masonry", "_count": 14 }, ... ]  // top 10
}
```

### `GET /api/admin/sessions`
Paged session log with mappings + recommendations + user joined in.
Query: `?take=50&skip=0&state=Bihar&language=hi` (`take` capped at 200).
```jsonc
{ "total": 42, "take": 50, "skip": 0,
  "items": [ { "id", "channel", "language", "rawTranscript", "detectedSkills": [],
               "bandwidthKbps", "state", "district", "createdAt",
               "user": { "id", "name", "phone", "district" } | null,
               "mappings": [ { "id", "normalizedSkill", "confidence",
                               "nsqfQualification": { "qpCode", "title", "nsqfLevel" } | null } ],
               "recommendations": [ { "id", "score", "status",
                                      "trainingProgram": { "name", "district" } } ] } ] }
```

### `GET /api/admin/geo`
`[ { "state": "Bihar", "_count": 9 }, ... ]` — for a choropleth.

### `POST /api/admin/programs` · `PATCH /api/admin/programs/:id`
Create / edit a training programme. Body mirrors the `TrainingProgram` fields in
[DATA-MODEL.md](./DATA-MODEL.md).

---

## Health

### `GET /health`
`200 { "status": "ok", "db": "up", "time": "..." }` — or `503` with
`"db": "down"` if Postgres is unreachable (the server stays up and every other
route returns `500` until the DB is back).
