import { NextRequest, NextResponse } from "next/server";
import type { LanguageCode } from "@/lib/languages";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

/** Languages ElevenLabs' multilingual models document real support for.
 *  The rest of Saksham's 10 languages fall back to the browser's own
 *  speech synthesis — see lib/speech.ts. */
const ELEVENLABS_LANGUAGES: LanguageCode[] = ["en", "hi", "ta"];

const DEFAULT_VOICE_ID = "EXAVITQu4vr4xnSDxMaL"; // "Sarah" — warm, clear, available on the free API tier

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const limit = rateLimit(`tts:${ip}`, 15, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(Math.ceil((limit.retryAfterMs ?? 60_000) / 1000)) } },
    );
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ElevenLabs is not configured" }, { status: 501 });
  }

  const body = await req.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.slice(0, 600) : "";
  const language = body?.language as LanguageCode | undefined;
  if (!text || !language) {
    return NextResponse.json({ error: "text and language are required" }, { status: 400 });
  }
  if (!ELEVENLABS_LANGUAGES.includes(language)) {
    return NextResponse.json({ error: `Language "${language}" is not ElevenLabs-supported here` }, { status: 422 });
  }

  const voiceId = process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE_ID;

  try {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.45, similarity_boost: 0.8 },
      }),
    });

    if (!res.ok || !res.body) {
      const detail = await res.text().catch(() => "");
      return NextResponse.json({ error: `ElevenLabs error ${res.status}: ${detail.slice(0, 200)}` }, { status: 502 });
    }

    return new NextResponse(res.body, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Could not reach ElevenLabs" }, { status: 502 });
  }
}
