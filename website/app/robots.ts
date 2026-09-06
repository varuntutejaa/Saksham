import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/admin", "/app", "/onboarding", "/auth", "/forgot-password"] },
    ],
    sitemap: "https://saksham-website-five.vercel.app/sitemap.xml",
  };
}
