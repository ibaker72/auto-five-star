import { cn } from "@/lib/utils";
import { BrandGlow } from "./brand-glow";

type SectionShellProps = {
  children: React.ReactNode;
  className?: string;
  /** Tone shifts the surface treatment for visual rhythm down the page. */
  tone?: "plain" | "soft" | "tint" | "navy";
  /** Optional decorative brand glow layered behind the content. */
  glow?: boolean;
  /** Optional id for in-page anchor navigation. */
  id?: string;
};

const toneClasses: Record<NonNullable<SectionShellProps["tone"]>, string> = {
  plain: "bg-background",
  soft: "bg-secondary/30",
  tint: "bg-gradient-to-b from-secondary/40 via-background to-background",
  navy: "bg-brand-navy text-white",
};

/**
 * Standard outer wrapper for marketing + dashboard sections. Keeps padding,
 * max-width, and tone consistent so individual pages stop redefining them.
 */
export function SectionShell({
  children,
  className,
  tone = "plain",
  glow = false,
  id,
}: SectionShellProps) {
  return (
    <section id={id} className={cn("relative isolate", toneClasses[tone])}>
      {glow ? <BrandGlow intensity="subtle" /> : null}
      <div
        className={cn(
          "container relative mx-auto px-6 py-14 sm:py-20",
          className,
        )}
      >
        {children}
      </div>
    </section>
  );
}
