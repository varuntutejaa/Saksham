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

---

## Assistant (the core pipeline)

### `POST /api/assistant/converse`
The whole voice flow in one call: speech/text → NSQF mapping → PM-AJAY
recommendations → spoken reply. Accepts **either** JSON with a `transcript`
**or** `multipart/form-data` with an `audio` file (same field names).

```jsonc
// request (JSON form)
{
  "transcript": "main raj mistri hoon, diwar aur plaster ka kaam",
  "language": "hi",              // hi|en|bn|ta|te|mr|kn|gu|pa|or  (default hi)
  "state": "Rajasthan",          // optional, improves ranking
  "district": "Jaipur",          // optional, improves ranking
  "userId": "clx...",            // optional, links session to a user
  "channel": "WEB",              // APP|WEB|IVR (default APP)
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
      "nsqfLevel": 3, "confidence": 0.55, "method": "keyword" }
  ],
  "recommendations": [
    { "recommendationId": "cmt...", "trainingProgramId": "pm-ajay-gia-...",
      "name": "PM-AJAY GIA — Assistant Mason & Carpenter, Jaipur",
      "nameHindi": "पीएम-अजय — ...", "scheme": "PM-AJAY", "component": "GIA",
      "sector": "Construction", "nsqfLevel": 3, "mode": "OFFLINE",
      "durationWeeks": 6, "stipend": true, "district": "Jaipur",
      "state": "Rajasthan", "contactPhone": "0141-000000",
      "seatsAvailable": 30, "score": 1, "rationale": "यह सुझाया गया क्योंकि ..." }
  ],
  "reply": { "text": "आपका हुनर Assistant Mason ...", "audioUrl": "data:text/plain;...", "format": "text" }
}
```
Notes:
- If nothing maps, `mappings` has one entry with `normalizedSkill: "unknown"` and
  `recommendations` may be empty.
- `reply.format` is `"text"` from the mock engine — clients speak it with
  on-device TTS. With Bhashini keys set it becomes a real audio URL.

### `PATCH /api/assistant/recommendations/:id`
Advance the funnel when a beneficiary acts on a recommendation.
```jsonc
{ "status": "INTERESTED" }  // SUGGESTED|VIEWED|INTERESTED|APPLIED|ENROLLED|REJECTED
// 200 <updated recommendation>   · 404 if id unknown
```

---

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
    "rawSkillText": "silai aur kadhai ka kaam", "nsqfQualificationId": "cmt..." } ]
```

### `GET /api/nsqf`
List NSQF qualifications. Query: `?sector=Construction&level=3`.
```jsonc
[ { "id", "qpCode": "CON/Q0101", "title": "Assistant Mason", "titleHindi",
    "sector": "Construction", "nsqfLevel": 3, "ssc", "description",
    "keywords": ["masonry"] } ]
```

### `GET /api/programs`
List active PM-AJAY training programmes. Query: `?state=&district=&sector=`.
```jsonc
[ { "id", "name", "nameHindi", "scheme": "PM-AJAY", "component": "GIA",
    "providerName", "sector", "nsqfLevel", "mode": "OFFLINE",
    "durationWeeks", "stipend": true, "certification", "state", "district",
    "address", "contactPhone", "seatsTotal", "seatsAvailable",
    "eligibilityNote", "active": true, "nsqfQualification": { ... } } ]
```

### `GET /api/programs/:id`
Single programme. `404` if unknown.

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
