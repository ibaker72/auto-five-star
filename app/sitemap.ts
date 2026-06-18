import type { MetadataRoute } from "next";
import { INDUSTRY_PACK_IDS } from "@/lib/templates/industry-packs";

const SITE_URL = "https://autofivestar.com";

/**
 * Sitemap covers public marketing pages, the audit funnel, signup/login,
 * and the programmatic industry landing pages generated from
 * `INDUSTRY_PACK_IDS`. App pages (dashboard, settings, etc.) are auth-gated
 * and intentionally excluded.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const core: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/features`, lastModified, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/pricing`, lastModified, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE_URL}/free-audit`, lastModified, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/agencies`, lastModified, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/contact`, lastModified, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/login`, lastModified, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/signup`, lastModified, changeFrequency: "yearly", priority: 0.4 },
  ];

  const industries: MetadataRoute.Sitemap = INDUSTRY_PACK_IDS
    .filter((id) => id !== "general")
    .map((id) => ({
      url: `${SITE_URL}/industries/${id.replace(/_/g, "-")}`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.7,
    }));

  return [...core, ...industries];
}
