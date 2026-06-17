import * as Sentry from "@sentry/nextjs";
import type { Metadata } from "next";
import "./globals.css";

export function generateMetadata(): Metadata {
  return {
    title: {
      default: "AutoFiveStar — AI review replies for local businesses",
      template: "%s · AutoFiveStar",
    },
    description:
      "AutoFiveStar uses AI to draft professional, on-brand replies to your Google reviews so you can approve and post in seconds.",
    metadataBase: new URL(
      process.env.NEXT_PUBLIC_APP_URL ?? "https://autofivestar.com",
    ),
    other: {
      ...Sentry.getTraceData(),
    },
  };
}

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