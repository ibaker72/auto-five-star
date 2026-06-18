"use client";

import * as React from "react";
import { Download, Check, X, Share, MoreVertical } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { LogoMark } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

/**
 * The `beforeinstallprompt` event isn't in the standard DOM lib types.
 * Chromium-only; on other browsers it simply never fires and we fall back to
 * manual instructions.
 */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type Platform = "ios" | "android" | "desktop";

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent || "";
  if (/iPad|iPhone|iPod/.test(ua)) return "ios";
  // iPadOS 13+ reports as Mac; detect touch Macs as iOS for install hints.
  if (/Macintosh/.test(ua) && "ontouchend" in document) return "ios";
  if (/Android/.test(ua)) return "android";
  return "desktop";
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS Safari
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

type InstallAppButtonProps = {
  className?: string;
  size?: ButtonProps["size"];
  variant?: ButtonProps["variant"];
  label?: string;
  /** Hide entirely once the app is installed/running standalone. */
  hideWhenInstalled?: boolean;
};

export function InstallAppButton({
  className,
  size = "sm",
  variant = "outline",
  label = "Install App",
  hideWhenInstalled = true,
}: InstallAppButtonProps) {
  const [mounted, setMounted] = React.useState(false);
  const [installed, setInstalled] = React.useState(false);
  const [showFallback, setShowFallback] = React.useState(false);
  const deferredRef = React.useRef<BeforeInstallPromptEvent | null>(null);

  React.useEffect(() => {
    setMounted(true);
    setInstalled(isStandalone());

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      deferredRef.current = e as BeforeInstallPromptEvent;
    };
    const onInstalled = () => {
      deferredRef.current = null;
      setInstalled(true);
      setShowFallback(false);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // Avoid SSR/client mismatch: render a stable placeholder until mounted.
  if (!mounted) {
    return (
      <Button
        type="button"
        size={size}
        variant={variant}
        className={className}
        disabled
        aria-hidden
      >
        <Download className="mr-1.5 h-4 w-4" />
        {label}
      </Button>
    );
  }

  if (installed && hideWhenInstalled) return null;

  const handleClick = async () => {
    const deferred = deferredRef.current;
    if (deferred) {
      try {
        await deferred.prompt();
        const { outcome } = await deferred.userChoice;
        if (outcome === "accepted") setInstalled(true);
        deferredRef.current = null;
        return;
      } catch {
        // Fall through to manual instructions if the prompt errors.
      }
    }
    setShowFallback(true);
  };

  return (
    <>
      <Button
        type="button"
        size={size}
        variant={variant}
        className={className}
        onClick={handleClick}
      >
        {installed ? (
          <Check className="mr-1.5 h-4 w-4" />
        ) : (
          <Download className="mr-1.5 h-4 w-4" />
        )}
        {installed ? "App installed" : label}
      </Button>
      {showFallback ? (
        <InstallInstructions onClose={() => setShowFallback(false)} />
      ) : null}
    </>
  );
}

function InstallInstructions({ onClose }: { onClose: () => void }) {
  const platform = detectPlatform();

  // Close on Escape for keyboard users.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const steps: Record<Platform, { title: string; items: React.ReactNode[] }> = {
    ios: {
      title: "Add to your iPhone or iPad",
      items: [
        <>
          Tap the <Share className="inline h-4 w-4 align-text-bottom" /> Share
          button in Safari&apos;s toolbar.
        </>,
        <>
          Scroll down and choose <strong>Add to Home Screen</strong>.
        </>,
        <>
          Tap <strong>Add</strong> — AutoFiveStar appears on your home screen.
        </>,
      ],
    },
    android: {
      title: "Install on Android",
      items: [
        <>
          Open the browser menu{" "}
          <MoreVertical className="inline h-4 w-4 align-text-bottom" /> (top
          right).
        </>,
        <>
          Tap <strong>Install app</strong> or{" "}
          <strong>Add to Home screen</strong>.
        </>,
        <>Confirm to add AutoFiveStar to your device.</>,
      ],
    },
    desktop: {
      title: "Install on your computer",
      items: [
        <>
          In Chrome or Edge, click the install icon{" "}
          <Download className="inline h-4 w-4 align-text-bottom" /> at the right
          edge of the address bar.
        </>,
        <>
          Or open the browser menu and choose{" "}
          <strong>Install AutoFiveStar</strong>.
        </>,
        <>Confirm to launch it in its own window.</>,
      ],
    },
  };

  const current = steps[platform];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Install AutoFiveStar"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-card-lift"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <LogoMark size={36} />
            <div>
              <p className="text-base font-semibold tracking-tight">
                {current.title}
              </p>
              <p className="text-xs text-muted-foreground">
                Install AutoFiveStar for one-tap access.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <ol className="mt-5 space-y-3">
          {current.items.map((item, i) => (
            <li key={i} className="flex gap-3 text-sm">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {i + 1}
              </span>
              <span className="pt-0.5 text-foreground">{item}</span>
            </li>
          ))}
        </ol>

        <div
          className={cn(
            "mt-5 rounded-lg border bg-secondary/40 p-3 text-xs text-muted-foreground",
          )}
        >
          Already installed? Open AutoFiveStar from your home screen or app
          launcher — it runs in its own window, just like a native app.
        </div>

        <Button
          type="button"
          variant="brand"
          className="mt-5 w-full"
          onClick={onClose}
        >
          Got it
        </Button>
      </div>
    </div>
  );
}
