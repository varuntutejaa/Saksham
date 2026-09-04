# Saksham — `server/` (Claude context)

The one backend. Everything (skill mapping, recommendation scoring, auth,
persistence) happens here; `app/` and `website/` are HTTP clients.

Read [`../docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md),
[`../docs/API.md`](../docs/API.md), [`../docs/DATA-MODEL.md`](../docs/DATA-MODEL.md).

## Stack

Express 4 + TypeScript (ESM, `NodeNext`) + Prisma 5 + PostgreSQL (Neon).
`tsx watch` in dev, `tsc` → `dist/` for prod.

## Layout

```
src/
  index.ts                app wiring; imports 'express-async-errors' FIRST
  lib/         env.ts (config + hasLLM/hasBhashini), prisma.ts (client singleton)
  middleware/  auth.ts (signToken, authenticate, requireRole)
  routes/      auth.ts · assistant.ts (the pipeline) · catalog.ts (public) · admin.ts
  services/
    speech.ts        transcribeAudio / synthesizeSpeech — Bhashini or mock
    skillLexicon.ts  informal phrase -> normalized skill token  (EDIT THIS to add coverage)
    nsqf.ts          normalized skill -> NsqfQualification (keyword match + confidence)
    recommend.ts     NSQF + location -> scored TrainingProgram list
    i18n.ts          templated multilingual "why this" rationale
prisma/
  schema.prisma    source of truth for the DB
  seed.ts          19 NSQF quals + 12 PM-AJAY programmes + demo users (idempotent)
```

## Rules

- **The API response shapes are a shared contract.** If you change one, update
  `website/lib/api.ts` + `app/src/lib/api.ts` types and `docs/API.md` in the
  same change.
- After editing `schema.prisma`: `npm run prisma:generate`, then `npm run db:push`
  (from repo root) or `npm run prisma:migrate` for a migration.
- Keep the mapping engine transparent — lexicon + keyword match, auditable
  confidence. LLM is only a reserved fallback (`hasLLM`).
- Every new async route: rely on `express-async-errors` (already global) — just
  `throw`, it becomes a 500. Don't let the process crash.
- Secrets only in `.env` (gitignored). `.env.example` documents the keys.

## Commands (from repo root)

```bash
npm run dev:server          # tsx watch, :4000
npm run db:push             # push schema to DB
npm run db:seed             # (re)seed
npm --prefix server run build
npm --prefix server exec prisma studio   # DB GUI :5555
```
