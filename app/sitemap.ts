import type { MetadataRoute } from "next";

const BASE = (
  process.env.NEXT_PUBLIC_APP_URL ?? "https://www.autofivestar.com"
).replace(/\/$/, "");

/**
 * Public marketing pages only. Per-lead audit results (/free-audit/results/*),
 * the authenticated app, and auth pages are intentionally excluded — they're
 * either private, non-indexable, or have no SEO value.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const routes: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
    { path: "/", priority: 1, changeFrequency: "weekly" },
    { path: "/features", priority: 0.8, changeFrequency: "monthly" },
    { path: "/pricing", priority: 0.8, changeFrequency: "monthly" },
    { path: "/free-audit", priority: 0.9, changeFrequency: "monthly" },
    { path: "/free-review-audit", priority: 0.7, changeFrequency: "monthly" },
    { path: "/contact", priority: 0.5, changeFrequency: "yearly" },
    { path: "/terms", priority: 0.3, changeFrequency: "yearly" },
    { path: "/privacy", priority: 0.3, changeFrequency: "yearly" },
  ];

  return routes.map((r) => ({
    url: `${BASE}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
}
