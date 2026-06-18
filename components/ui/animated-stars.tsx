import { cn } from "@/lib/utils";

type AnimatedStarsProps = {
  /** How many filled stars (0-5). Anything else clamped. */
  rating?: number;
  /** Whether stars should gently pulse. */
  animated?: boolean;
  /** Visual size — sm for inline, md for cards, lg for hero. */
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: string;
};

const sizeClasses: Record<NonNullable<AnimatedStarsProps["size"]>, string> = {
  sm: "text-sm",
  md: "text-lg",
  lg: "text-3xl",
};

/**
 * Decorative star row. Useful for hero credibility, empty states, and any
 * "five-star" motif. Pure CSS animation, respects reduced motion via global
 * media query in globals.css.
 */
export function AnimatedStars({
  rating = 5,
  animated = true,
  size = "md",
  className,
  label,
}: AnimatedStarsProps) {
  const safe = Math.max(0, Math.min(5, Math.round(rating)));
  return (
    <span
      aria-label={label ?? `${safe} of 5 stars`}
      role="img"
      className={cn(
        "inline-flex items-center gap-0.5 tabular-nums",
        sizeClasses[size],
        className,
      )}
    >
      {Array.from({ length: 5 }).map((_, i) => {
        const filled = i < safe;
        return (
          <span
            key={i}
            aria-hidden="true"
            className={cn(
              "inline-block leading-none",
              filled ? "text-brand-amber" : "text-muted-foreground/30",
              animated && filled ? "animate-brand-star" : null,
            )}
            style={animated && filled ? { animationDelay: `${i * 220}ms` } : undefined}
          >
            ★
          </span>
        );
      })}
    </span>
  );
}
