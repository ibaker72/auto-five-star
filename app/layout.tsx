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
