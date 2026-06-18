import { cn } from "@/lib/utils";

/**
 * AutoFiveStar logo system.
 *
 * - `LogoMark`  — the standalone gradient star badge (square, scalable).
 * - `Logo`      — the mark plus the wordmark, for navbars/footers/auth pages.
 *
 * Pure SVG + text, no client hooks, so it renders safely in Server Components.
 * The gradient stop colors mirror the brand tokens in globals.css
 * (brand-electric → brand-cyan). Duplicate gradient ids across instances are
 * harmless: each instance resolves its own identical definition.
 */

type LogoMarkProps = {
  /** Pixel size of the square mark. Defaults to 28. */
  size?: number;
  className?: string;
  /** Override the gradient id (only needed in rare cross-fade cases). */
  gradientId?: string;
};

export function LogoMark({
  size = 28,
  className,
  gradientId = "afs-logo-gradient",
}: LogoMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      role="img"
      aria-label="AutoFiveStar"
      className={cn("shrink-0", className)}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1e3a8a" />
          <stop offset="45%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#38bdf8" />
        </linearGradient>
      </defs>
      {/* Rounded badge */}
      <rect width="32" height="32" rx="8" fill={`url(#${gradientId})`} />
      {/* Five-point star */}
      <path
        d="M16 6.2l2.74 5.56 6.13.89-4.44 4.33 1.05 6.11L16 20.31l-5.48 2.88 1.05-6.11-4.44-4.33 6.13-.89z"
        fill="#ffffff"
      />
      {/* Check accent — review handled */}
      <path
        d="M13.4 15.7l1.7 1.7 3.5-3.6"
        fill="none"
        stroke="#2563eb"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type LogoProps = {
  /** Pixel size of the mark. Wordmark scales with surrounding font size. */
  markSize?: number;
  /** Hide the wordmark and show only the badge. */
  markOnly?: boolean;
  className?: string;
  wordmarkClassName?: string;
};

export function Logo({
  markSize = 28,
  markOnly = false,
  className,
  wordmarkClassName,
}: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark size={markSize} />
      {markOnly ? null : (
        <span
          className={cn(
            "font-bold tracking-tight text-brand-gradient",
            wordmarkClassName,
          )}
        >
          AutoFiveStar
        </span>
      )}
    </span>
  );
}
