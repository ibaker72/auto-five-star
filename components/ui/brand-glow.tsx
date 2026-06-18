import { cn } from "@/lib/utils";

type BrandGlowProps = {
  className?: string;
  /** Visual intensity — softer for dashboards, brighter on marketing. */
  intensity?: "subtle" | "default" | "bold";
  /** When true the glow drifts gently. Off in dense UI contexts. */
  animated?: boolean;
};

const intensityClasses: Record<NonNullable<BrandGlowProps["intensity"]>, string> = {
  subtle: "opacity-50",
  default: "opacity-70",
  bold: "opacity-90",
};

/**
 * Decorative radial glow used behind hero sections, empty states, and feature
 * cards. Pointer-events disabled, aria-hidden — it never affects layout.
 */
export function BrandGlow({
  className,
  intensity = "default",
  animated = true,
}: BrandGlowProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className,
      )}
    >
      <div
        className={cn(
          "absolute -top-1/3 left-1/2 h-[60rem] w-[60rem] -translate-x-1/2 rounded-full blur-3xl",
          intensityClasses[intensity],
          animated ? "animate-brand-glow" : null,
        )}
        style={{
          background:
            "radial-gradient(closest-side, hsl(var(--brand-electric) / 0.45), hsl(var(--brand-cyan) / 0.25) 55%, transparent 75%)",
        }}
      />
      <div
        className={cn(
          "absolute -bottom-1/2 right-[-10%] h-[40rem] w-[40rem] rounded-full blur-3xl",
          intensityClasses[intensity],
        )}
        style={{
          background:
            "radial-gradient(closest-side, hsl(var(--brand-amber) / 0.25), transparent 70%)",
        }}
      />
    </div>
  );
}
