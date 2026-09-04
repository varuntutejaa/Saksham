# Saksham — `website/` (Claude context)

You are working on the **website** of the Saksham monorepo. Read
[`../docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md),
[`../docs/API.md`](../docs/API.md) and
[`../docs/DATA-MODEL.md`](../docs/DATA-MODEL.md) before changing how data flows.

## What this is

Next.js 15 (App Router) + React 19 + Tailwind v4. Two audiences:

| Route | Purpose | Auth |
|-------|---------|------|
| `/` | Public info page + live "skill mapper" try-out + PM-AJAY programme list | none |
| `/admin/login` | Admin sign-in | none |
| `/admin` | Dashboard — KPIs, recommendation funnel, sessions by language, top skills | token |
| `/admin/sessions` | Full session log (transcript, NSQF mapping, top recommendation) | token |

## The one rule

**The website only talks to the backend over HTTP.** There is no database here,
no Prisma, no server secrets. Every backend call goes through the typed client
[`lib/api.ts`](lib/api.ts) — extend that file, don't scatter `fetch` calls.

If a change needs a new/changed API response shape, that's a `server/` change +
a matching edit to `lib/api.ts` types + [`../docs/API.md`](../docs/API.md). Flag
it — the backend is a teammate's area; coordinate rather than editing `server/`
silently.

## Layout

```
app/
  layout.tsx            root layout + globals.css
  page.tsx              public landing (server component)
  skill-tryout.tsx      'use client' — calls POST /api/nsqf/map
  program-list.tsx      'use client' — calls GET /api/programs
  admin/
    admin-shell.tsx     'use client' — nav + auth guard (redirects if no token)
    login/page.tsx      'use client' — POST /api/auth/login, saves token
    page.tsx             'use client' — GET /api/admin/stats
    sessions/page.tsx    'use client' — GET /api/admin/sessions
lib/
  api.ts               typed fetch client + all response interfaces
  auth.ts              'use client' — token in localStorage ('saksham.admin.token')
```

## Running

The website is useless without the backend. From the **repo root**:

```bash
npm run dev          # starts server (:4000) AND website (:3000) together
```

Website alone: `npm run dev:website`. Backend must already be up on `:4000`
(`NEXT_PUBLIC_API_URL` in `.env.local`, default `http://localhost:4000`).

Seeded admin login: **`9999900000` / `admin123`** (pre-filled on the login form).

Before committing: `npm run build` (from `website/`) — catches client/server
boundary and type errors. `npx tsc --noEmit` for a quick check.

## Conventions

- **Client vs server components:** anything using `useState`/`useEffect`/
  `localStorage`/event handlers needs `'use client'` at the top. `app/page.tsx`
  stays a server component and imports client leaves.
- **Data fetching:** currently client-side (`useEffect` + `lib/api.ts`) because
  admin calls need the localStorage token. Keep that pattern for admin. Public
  pages *could* fetch server-side, but the API base is a browser URL — keep it
  client-side unless you add a server-only base.
- **Styling:** Tailwind v4, utility classes inline. Brand colour is
  `text-brand` / `bg-brand` (`#208aef`, defined in `app/globals.css`). Dark mode
  via `dark:` + `prefers-color-scheme`.
- **Charts:** hand-rolled CSS bars in `app/admin/page.tsx` (no chart lib — keep
  it that way unless there's a real need).
- **Errors:** every API call shows a friendly "is the backend running?" message
  on failure — match that pattern.

## Gotchas

- **Neon cold start:** the first API call after idle takes ~2–3s (free tier).
  Not a bug.
- **`GET /sw.js 404`** in the dev log is the browser probing for a service
  worker. Ignore.
- **Token expiry / 401:** `lib/api.ts` throws on non-OK; admin pages catch and
  show an error but don't auto-logout on 401 yet — a reasonable thing to add.
- Multiple lockfiles on this machine — `next.config.ts` pins
  `outputFileTracingRoot` to silence the warning. Leave it.
