/**
 * In-memory, per-IP sliding-window rate limiter for API routes.
 *
 * This resets whenever the serverless instance cold-starts and only
 * throttles requests hitting the same warm instance — not a perfect global
 * limit, but it stops the common case (a script hammering the endpoint
 * from one place) without needing an external service like Upstash Redis.
 * If this site gets real sustained traffic, swap this for Vercel KV /
 * Upstash — the call sites below don't need to change.
 */
const buckets = new Map<string, number[]>();

const MAX_BUCKETS = 5000; // bound memory: evict oldest entries past this

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfterMs?: number } {
  const now = Date.now();
  const windowStart = now - windowMs;

  let hits = buckets.get(key);
  if (!hits) {
    if (buckets.size >= MAX_BUCKETS) {
      const oldestKey = buckets.keys().next().value;
      if (oldestKey !== undefined) buckets.delete(oldestKey);
    }
    hits = [];
    buckets.set(key, hits);
  }

  const recent = hits.filter((t) => t > windowStart);
  if (recent.length >= limit) {
    buckets.set(key, recent);
    return { ok: false, retryAfterMs: recent[0] + windowMs - now };
  }

  recent.push(now);
  buckets.set(key, recent);
  return { ok: true };
}

export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
