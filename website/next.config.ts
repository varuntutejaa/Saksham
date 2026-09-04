import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // This monorepo (and the machine's home dir) contain other lockfiles; pin the
  // tracing root to this package so Next doesn't guess.
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
