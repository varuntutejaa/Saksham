import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // This monorepo (and the machine's home dir) contain other lockfiles; pin the
  // tracing root to this package so Next doesn't guess.
  outputFileTracingRoot: path.join(__dirname),
  async headers() {
    // A properly nonce-based CSP was attempted here (middleware generating
    // a per-request nonce) and reverted: Next.js's App Router injects its
    // own inline bootstrap/streaming scripts and, in testing, a strict
    // `script-src 'self' 'nonce-...' 'strict-dynamic'` ended up blocking
    // Next's own chunk <script> tags too (verified: broke every client-side
    // redirect on the whole site, including the admin login gate). Rather
    // than leave that broken or spend longer chasing Next-version-specific
    // nonce propagation, 'unsafe-inline' is the accepted trade-off here —
    // it still blocks the more common cross-origin script-injection vector
    // via `script-src 'self'`, just not same-page inline injection.
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "media-src 'self' blob:",
      "font-src 'self'",
      "connect-src 'self' https://saksham-api-82mn.onrender.com https://api.bigdatacloud.net",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ");

    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          // the Speak screen needs the mic on this origin; nothing else does
          { key: "Permissions-Policy", value: "microphone=(self), geolocation=(self), camera=()" },
          { key: "Content-Security-Policy", value: csp },
        ],
      },
    ];
  },
};

export default nextConfig;
