# सक्षम · Saksham

**AI-Driven Voice Assistant for Livelihood Mapping and NSQF-Aligned Skilling
Recommendations for SC Communities under PM-AJAY**
Ministry of Social Justice & Empowerment

A beneficiary describes their traditional skill in their own language. Saksham
maps that informal skill to a formal **NSQF qualification** and recommends nearby
**PM-AJAY** training programmes — voice-first, multi-language, audio output,
low-bandwidth.

---

## Monorepo layout

| Folder      | Stack                                   | What it is |
|-------------|-----------------------------------------|------------|
| `server/`   | Express + TypeScript + Prisma + Postgres | The one backend. NSQF mapping, PM-AJAY recommendation engine, auth, admin API. **Both the app and the website talk only to this.** |
| `app/`      | Expo (React Native) + Expo Router       | The voice-first assistant for beneficiaries. |
| `website/`  | Next.js (App Router) + Tailwind          | Public info page + **admin dashboard** for tracking (sessions, funnel, languages, skills). |

```
          ┌─────────────┐         ┌──────────────┐
          │   app/      │         │  website/    │
          │ (Expo RN)   │         │  (Next.js)   │
          └──────┬──────┘         └───────┬──────┘
                 │   HTTP / JSON (:4000)  │
                 └───────────┬────────────┘
                       ┌─────▼──────┐
                       │  server/   │  Express + Prisma
                       └─────┬──────┘
                       ┌─────▼──────┐
                       │ PostgreSQL │  (Neon / Supabase)
                       └────────────┘
```

---

## One-time setup

### 1. Database (Neon or Supabase — free, no local install)

- **Neon:** <https://neon.tech> → new project → copy the connection string (URI).
- **Supabase:** <https://supabase.com> → project → Settings → Database → URI.

Paste it into `server/.env` as `DATABASE_URL`.

### 2. Install everything

```bash
npm install            # root (installs concurrently)
npm run install:all    # server + website + app
```

### 3. Create tables + load sample data

```bash
npm run db:setup       # prisma db push + seed (NSQF quals, PM-AJAY programmes, demo users)
```

Seeded logins:

| Role        | Phone        | Password   |
|-------------|--------------|------------|
| Admin       | `9999900000` | `admin123` |
| Beneficiary | `9000000001` | `demo123`  |

---

## Run

```bash
npm run dev            # server (:4000) + website (:3000) together
npm run dev:app        # the Expo app (separate terminal)
```

- Website: <http://localhost:3000> — admin at <http://localhost:3000/admin>
- API health: <http://localhost:4000/health>
- App: press `i` / `a` in the Expo terminal, or scan the QR with Expo Go.

### Pointing the app at the backend

On a simulator, `localhost` works. On a **physical phone**, set the API URL so it
reaches your laptop:

```bash
# app/.env
EXPO_PUBLIC_API_URL=http://<your-laptop-lan-ip>:4000
```

(If unset, the app auto-derives the LAN host from the Expo dev server.)

---

## How the skill → programme flow works

1. **Speech → text** (`server/src/services/speech.ts`) — Bhashini ASR when
   `BHASHINI_*` keys are set, otherwise a deterministic offline mock so the demo
   runs with zero external dependencies.
2. **Text → NSQF** (`server/src/services/skillLexicon.ts` + `nsqf.ts`) — a
   transparent, editable lexicon maps informal phrases (`"mitti ke bartan"`) to a
   normalized skill, then to an `NsqfQualification` by keyword. Confidence is the
   keyword-overlap ratio.
3. **NSQF + location → PM-AJAY programmes** (`server/src/services/recommend.ts`) —
   weighted score: qualification match, sector match, district, state, seats,
   stipend.
4. **Rationale** (`server/src/services/i18n.ts`) — templated "why this" sentence
   in the beneficiary's language, spoken back with on-device TTS.
5. Every session, mapping and recommendation is persisted for the **admin
   dashboard**.

Swap the mock engines for real providers by setting the optional keys in
`server/.env` — no other code changes.

---

## API surface (all under `server/`)

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/assistant/converse` | Full pipeline: audio/transcript → NSQF → recommendations → spoken reply |
| `PATCH`| `/api/assistant/recommendations/:id` | Update funnel status (viewed / interested / applied / enrolled) |
| `POST` | `/api/nsqf/map` | Map free text to NSQF (no persistence) — used by the website try-out |
| `GET`  | `/api/nsqf` | List NSQF qualifications |
| `GET`  | `/api/programs` | List PM-AJAY training programmes |
| `POST` | `/api/auth/login` · `/register` · `GET /me` | JWT auth |
| `GET`  | `/api/admin/stats` · `/sessions` · `/geo` | Admin dashboard (ADMIN role) |
| `POST` | `/api/admin/programs` · `PATCH /:id` | Manage programmes |

---

## Deliverables

- **Working app** — `app/` (Expo)
- **GitHub repository** — this repo
- **Demo video** — record the app flow + admin dashboard
