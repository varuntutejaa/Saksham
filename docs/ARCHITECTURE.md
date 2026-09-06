# Saksham Architecture

## The three parts

```
   app/  (Expo RN)                website/  (Next.js)
   beneficiary voice UI           public page + admin dashboard
        │                                  │
        │      HTTP / JSON  ── :4000 ──     │
        └──────────────────┬───────────────┘
                    server/  (Express + Prisma)
                  the ONLY thing that touches the DB
                           │
                    PostgreSQL (Neon)
```

- **One backend.** Both clients are dumb; all skill-mapping, recommendation
  scoring, auth and persistence happen in `server/`.
- **The website talks to the backend only over HTTP** via
  [`website/lib/api.ts`](../website/lib/api.ts). It has no DB driver, no Prisma,
  no server secrets.
- Contract between them = [API.md](./API.md). Change the shape of a response in
  `server/` → update `website/lib/api.ts` types + [API.md](./API.md) in the same
  change.

## Request lifecycle — `POST /api/assistant/converse`

The one flow that matters. Code in
[`server/src/routes/assistant.ts`](../server/src/routes/assistant.ts).

1. **Speech → text** — [`services/speech.ts`](../server/src/services/speech.ts).
   `transcribeAudio()`. Uses Bhashini ASR if `BHASHINI_*` env keys are set,
   else returns a deterministic canned transcript per language (so the demo runs
   fully offline). If the caller sent a `transcript` string, this step is skipped.
2. **Text → normalized skills** —
   [`services/skillLexicon.ts`](../server/src/services/skillLexicon.ts).
   `extractSkills()` scans the transcript for phrases like `"mitti ke bartan"`,
   `"silai"`, `"raj mistri"` (Hindi + transliterations + Devanagari) and emits
   tokens like `pottery`, `tailoring`, `masonry`. **This lexicon is the main
   place to add coverage** — pure data, no code.
3. **Normalized skills → NSQF** —
   [`services/nsqf.ts`](../server/src/services/nsqf.ts). `mapTranscriptToNsqf()`
   matches each token against `NsqfQualification.keywords`. Confidence = keyword
   overlap ratio, capped at 0.95. No match → stored with null qualification,
   `confidence 0.2`, flagged for review.
4. **NSQF + location → PM-AJAY courses** —
   [`services/recommend.ts`](../server/src/services/recommend.ts).
   `recommendCourses()` scores the real `PmajayCourse` catalogue:
   `0.50` keyword hit · `0.20` same sector · `0.15` same trade in title ·
   `0.10` national or user's state · `0.05` mapped to a QP. Top 5 are sorted
   nearest-first where the PM-AJAY catalogue publishes state scope, then by
   relevance. The illustrative `TrainingProgram` browse endpoint separately
   ranks saved-location results by district, then state.
5. **Rationale** — [`services/i18n.ts`](../server/src/services/i18n.ts).
   Templated "why this" sentence in the beneficiary's language (not free LLM
   text — predictable for audio + auditable).
6. **Persist** — the session, its `SkillMapping` rows and `Recommendation` rows
   are written in one `prisma.voiceSession.create` with nested writes. This is
   what the admin dashboard reads.
7. **Reply** — `buildSpokenReply()` composes the spoken text; `synthesizeSpeech()`
   returns it as `format: "text"` (mock) or an audio URL (Bhashini). Clients
   speak it with on-device TTS.

## Auth

- `POST /api/auth/login` → JWT (30-day). `Authorization: Bearer <token>` on
  `/api/admin/*`. Middleware:
  [`server/src/middleware/auth.ts`](../server/src/middleware/auth.ts)
  (`authenticate`, `requireRole("ADMIN")`).
- Website keeps the token in `localStorage` (`saksham.admin.token`) —
  [`website/lib/auth.ts`](../website/lib/auth.ts). `AdminShell` redirects to
  `/admin/login` when it's missing.
- The app's flow is splash (`/`) → language (`/language`, 9 languages) → auth
  (`/auth`, login or sign up) → assistant (`/home`). "Continue without an
  account" on the auth screen skips straight to `/home` — sessions from a
  guest have `userId: null`; sessions from a signed-in beneficiary carry their
  `user.id`. Token + user are cached on-device (`app/src/lib/auth.tsx`,
  AsyncStorage key `saksham.auth.v1`) alongside the language/location profile
  (`app/src/lib/store.tsx`, key `saksham.profile.v1`) so a returning user skips
  straight past the splash to `/home`.

## Error behaviour

`express-async-errors` is imported first in
[`server/src/index.ts`](../server/src/index.ts) so a thrown error in any async
handler becomes a `500` instead of crashing the process. If Postgres is down,
`/health` returns `503` and data routes return `500` — the server stays up.

## Environments / ports

| Thing | Port | Env var |
|-------|------|---------|
| server | 4000 | `server/.env` → `DATABASE_URL`, `JWT_SECRET`, `PORT` |
| website | 3000 | `website/.env.local` → `NEXT_PUBLIC_API_URL` |
| app | Metro 8081 | defaults to the deployed backend; override with `app/.env` → `EXPO_PUBLIC_API_URL` |

`npm run dev` (root) runs server + website together via `concurrently`.
`npm run dev:app` runs Expo separately.

## Optional real providers

Set in `server/.env`, no code change needed:
- `ANTHROPIC_API_KEY` — reserved for an LLM mapping fallback (`hasLLM` in
  `server/src/lib/env.ts`).
- `BHASHINI_API_KEY` + `BHASHINI_USER_ID` — real ASR/TTS; wire the ULCA calls in
  the marked stubs in `services/speech.ts`.
