import * as Sentry from "@sentry/nextjs";
import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "AutoFiveStar — Never miss a bad review again",
    template: "%s · AutoFiveStar",
  },
  description:
    "AI review response and review growth engine for local businesses. Instant review alerts, AI-powered replies, review-request automation, and analytics.",
  applicationName: "AutoFiveStar",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "https://www.autofivestar.com",
  ),
  alternates: { canonical: "https://www.autofivestar.com" },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "AutoFiveStar",
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
  openGraph: {
    siteName: "AutoFiveStar",
    type: "website",
    url: "https://www.autofivestar.com",
    title: "AutoFiveStar — Review growth engine for local businesses",
    description:
      "AI review response and review growth engine for local businesses.",
    images: ["/opengraph-image"],
  },
  twitter: {
    card: "summary_large_image",
    title: "AutoFiveStar — Review growth engine for local businesses",
    description:
      "AI review response and review growth engine for local businesses.",
    images: ["/twitter-image"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#2563eb",
};

// Reference Sentry so the import is not tree-shaken away — keeps the
// nextjs SDK's side-effectful instrumentation hooks in the bundle.
void Sentry;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
