# सक्षम · Saksham — Website

A full web clone of **Saksham**, the AI-driven voice assistant for livelihood
mapping and NSQF-aligned skilling recommendations for SC communities under
PM-AJAY (Ministry of Social Justice & Empowerment) — the beneficiary app,
the public marketing site, and an admin dashboard, all wired to the real
deployed Saksham API (no mock data).

Source concept / full monorepo: https://github.com/varuntutejaa/Saksham

## What's here

- **Marketing site** (`/`) — the concept, live skill-mapper demo, PM-AJAY
  programme catalogue, mobile app screenshots.
- **Beneficiary app** (`/welcome`, `/language`, `/auth`, `/onboarding/*`,
  `/app/*`) — language picker, phone/password auth, OTP password reset,
  3-step onboarding, and the core Home / Speak / Programs / Profile flow.
  Speak uses the Web Audio API for real-time mic-level metering and the
  browser's SpeechRecognition for transcription, with a typed fallback
  always available.
- **Admin dashboard** (`/admin/*`) — sidebar app shell, live stats and
  funnel, a Sessions log, and a Users view (every beneficiary, click through
  to their full session/skill/recommendation history).
- **Voice replies** — ElevenLabs for English, Hindi and Tamil (the
  languages its multilingual model documents real support for); every
  other language falls back to the browser's own speech synthesis, so
  nothing goes silent.

## Run locally

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. Admin dashboard: <http://localhost:3000/admin>
(admin login: phone `9999900000`, password `admin123`).

By default the site talks to the live backend
(`https://saksham-api-82mn.onrender.com`). To point it at a local `server/`
instance instead, copy `.env.example` to `.env.local` and set
`NEXT_PUBLIC_API_URL=http://localhost:4000`.

### Enabling ElevenLabs voices

Set `ELEVENLABS_API_KEY` (server-side only, see `.env.example`) to turn on
real spoken replies for English/Hindi/Tamil via `/api/tts`. Without it,
every language uses the browser's own speech synthesis — nothing breaks,
it just sounds more robotic.

## Stack

Next.js 15 (App Router) · React 19 · Tailwind v4 · `lucide-react` ·
Fraunces + Plus Jakarta Sans (`next/font/google`) · ElevenLabs TTS
