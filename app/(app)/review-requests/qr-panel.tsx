"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type Props = {
  defaultUrl: string;
  defaultLocationName: string;
};

export function QrPanel({ defaultUrl, defaultLocationName }: Props) {
  const [url, setUrl] = useState(
    defaultUrl || "https://g.page/r/your-business/review",
  );
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [locationName, setLocationName] = useState(defaultLocationName);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    if (!url) {
      setPreviewDataUrl(null);
      return;
    }
    const trimmed = url.trim();
    try {
      const u = new URL(trimmed);
      if (u.protocol !== "http:" && u.protocol !== "https:") {
        throw new Error("only http(s) URLs work in a QR code");
      }
    } catch {
      setError("That doesn't look like a usable URL yet.");
      setPreviewDataUrl(null);
      return;
    }

    // Use a debounce so we don't fetch on every keystroke.
    const t = setTimeout(() => {
      void fetchQrSvg(url).then((data) => {
        if (cancelled) return;
        if (data) setPreviewDataUrl(data);
      });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [url]);

  const downloadHref = (format: "png" | "svg") =>
    `/api/review-requests/qr?format=${format}&url=${encodeURIComponent(url)}`;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="qr-url">Google review URL</Label>
          <Input
            id="qr-url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://g.page/r/.../review"
          />
          <p className="text-xs text-muted-foreground">
            Paste your Google review link. We never send this to a third
            party — QR rendering happens on AutoFiveStar.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="qr-location">Location name (for printables)</Label>
          <Input
            id="qr-location"
            value={locationName}
            onChange={(e) => setLocationName(e.target.value)}
            placeholder="Main Street Shop"
          />
        </div>

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>QR not generated</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <a href={downloadHref("png")} download>
              Download PNG
            </a>
          </Button>
          <Button asChild variant="outline">
            <a href={downloadHref("svg")} download>
              Download SVG
            </a>
          </Button>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center rounded-2xl border bg-gradient-to-b from-secondary/40 to-background p-6 text-center">
        <div className="flex h-64 w-64 items-center justify-center rounded-xl border bg-white p-3 shadow-card-soft">
          {previewDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewDataUrl}
              alt="QR code preview"
              className="h-full w-full object-contain"
            />
          ) : (
            <span className="text-sm text-muted-foreground">
              Generating preview…
            </span>
          )}
        </div>
        <p className="mt-3 text-sm font-medium text-foreground">
          Scan to leave us a Google review
        </p>
        <p className="text-xs text-muted-foreground">
          {locationName || "Your business"} appreciates your honest feedback.
        </p>
      </div>
    </div>
  );
}

async function fetchQrSvg(url: string): Promise<string | null> {
  // Use the SVG endpoint for previewing — small payload, scalable.
  try {
    const res = await fetch(
      `/api/review-requests/qr?format=svg&url=${encodeURIComponent(url)}`,
      { cache: "no-store" },
    );
    if (!res.ok) return null;
    const svg = await res.text();
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  } catch {
    return null;
  }
}
