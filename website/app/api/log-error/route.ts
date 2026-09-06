import { NextRequest, NextResponse } from "next/server";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

/** No external error-monitoring account (Sentry etc.) is wired up yet — this
 *  at least puts client-side errors into Vercel's function logs instead of
 *  vanishing entirely. Search Vercel's log dashboard for "[client-error]" to
 *  find these. Swap this for a real Sentry/Bugsnag DSN when one exists;
 *  callers (see lib/error-reporting.ts) don't need to change. */
export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const limit = rateLimit(`log-error:${ip}`, 20, 60_000);
  if (!limit.ok) return NextResponse.json({ ok: false }, { status: 429 });

  const body = await req.json().catch(() => null);
  if (!body?.message) return NextResponse.json({ ok: false }, { status: 400 });

  console.error(
    `[client-error] ${String(body.message).slice(0, 500)} | url=${String(body.url ?? "").slice(0, 300)} | stack=${String(body.stack ?? "").slice(0, 1000)}`,
  );

  return NextResponse.json({ ok: true });
}
