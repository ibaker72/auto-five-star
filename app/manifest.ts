import type { MetadataRoute } from "next";

// Served at /manifest.webmanifest. Next links it automatically from the
// document head. The proxy treats /manifest.webmanifest and /icons/* as public.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AutoFiveStar",
    short_name: "AutoFiveStar",
    description:
      "AI review response and review growth engine for local businesses.",
    id: "/dashboard",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    theme_color: "#2563eb",
    background_color: "#ffffff",
    categories: ["business", "productivity"],
    icons: [
      {
        src: "/icon.svg",
        type: "image/svg+xml",
        sizes: "any",
        purpose: "any",
      },
      {
        src: "/icons/icon-192",
        type: "image/png",
        sizes: "192x192",
        purpose: "any",
      },
      {
        src: "/icons/icon-512",
        type: "image/png",
        sizes: "512x512",
        purpose: "any",
      },
      {
        src: "/icons/maskable-icon",
        type: "image/png",
        sizes: "512x512",
        purpose: "maskable",
      },
    ],
  };
}
