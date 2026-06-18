import type { MetadataRoute } from "next";

const SITE_URL = "https://autofivestar.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Auth-gated app pages and per-lead audit results should not be
        // indexed. /api is also off-limits to crawlers.
        disallow: [
          "/api/",
          "/dashboard",
          "/inbox",
          "/locations",
          "/settings",
          "/billing",
          "/review-requests",
          "/onboarding",
          "/free-audit/results/",
          "/auth/",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
