import * as Sentry from "@sentry/nextjs";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "AutoFiveStar — Never miss a bad review again",
    template: "%s · AutoFiveStar",
  },
  description:
    "Get instant review alerts, AI-powered responses, analytics, and reputation monitoring for your business. Start your free reputation audit.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "https://autofivestar.com",
  ),
  openGraph: {
    siteName: "AutoFiveStar",
  },
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
