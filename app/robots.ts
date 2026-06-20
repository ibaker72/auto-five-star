import type { MetadataRoute } from "next";

const BASE = (
  process.env.NEXT_PUBLIC_APP_URL ?? "https://www.autofivestar.com"
).replace(/\/$/, "");

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/dashboard",
          "/inbox",
          "/settings",
          "/billing",
          "/locations",
          "/reviews",
          "/review-requests",
          "/onboarding",
          "/auth/",
          // Per-lead audit results are noindex on the page itself; keep
          // crawlers off the path entirely too.
          "/free-audit/results/",
        ],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
