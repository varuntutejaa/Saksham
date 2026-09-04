# Saksham — monorepo (Claude context)

**AI-Driven Voice Assistant for Livelihood Mapping and NSQF-Aligned Skilling
Recommendations for SC Communities under PM-AJAY** (Ministry of Social Justice &
Empowerment). A beneficiary says their traditional skill in their own language →
the system maps it to a formal NSQF qualification → recommends nearby PM-AJAY
training programmes. Voice-first, 10 Indian languages, audio output,
low-bandwidth.

## Structure

| Folder | Stack | Owner-facing docs |
|--------|-------|-------------------|
| `server/` | Express + TypeScript + Prisma + PostgreSQL (Neon) | the ONLY DB client; all logic lives here |
| `app/` | Expo SDK 57 (React Native) + Expo Router | beneficiary voice UI — see `app/AGENTS.md` |
| `website/` | Next.js 15 + Tailwind v4 | public page + admin dashboard — see `website/CLAUDE.md` |

`app/` and `website/` are thin HTTP clients of `server/`. They never touch the DB.

## Read first

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — how the parts connect, the
  `converse` request lifecycle, auth, ports.
- [`docs/API.md`](docs/API.md) — every endpoint with request/response examples.
- [`docs/DATA-MODEL.md`](docs/DATA-MODEL.md) — Prisma schema explained.

## Commands (from repo root)

```bash
npm install && npm run install:all   # one-time: root + all three packages
npm run db:setup                     # prisma db push + seed (needs server/.env DATABASE_URL)
npm run dev                          # server :4000 + website :3000
npm run dev:app                      # Expo app (separate terminal)
npm run typecheck                    # all three packages
npm run build                        # server + website production builds
```

## Working agreements

- **The API contract is shared.** Changing a response shape in `server/` means
  updating `website/lib/api.ts` (and `app/src/lib/api.ts`) types and
  `docs/API.md` in the same change. Coordinate across folders.
- Secrets live in `server/.env` only (gitignored). Never commit connection
  strings or move them into `app/` or `website/`.
- The skill-mapping engine is deliberately transparent (an editable lexicon +
  keyword match, not a black box) — extend
  `server/src/services/skillLexicon.ts` to add skill coverage.
- Mock STT/TTS is intentional so the demo runs offline; real providers plug in
  via env keys with no code change.

## Deliverables

Working app · demo video · GitHub repo (`varuntutejaa/Saksham`).
