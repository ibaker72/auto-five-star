import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader } from "./card";

type MetricCardProps = {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "primary" | "success" | "warning" | "danger";
  className?: string;
};

const toneClasses: Record<NonNullable<MetricCardProps["tone"]>, string> = {
  default: "border-border",
  primary: "border-primary/30 bg-gradient-to-b from-primary/5 to-transparent",
  success:
    "border-emerald-200/70 bg-gradient-to-b from-emerald-50 to-transparent",
  warning:
    "border-amber-200/70 bg-gradient-to-b from-amber-50 to-transparent",
  danger:
    "border-rose-200/70 bg-gradient-to-b from-rose-50 to-transparent",
};

/**
 * Dashboard stat tile with brand-aligned styling. Subtle hover lift, tonal
 * accent for primary metrics, accessible labels.
 */
export function MetricCard({
  label,
  value,
  hint,
  tone = "default",
  className,
}: MetricCardProps) {
  return (
    <Card
      className={cn(
        "hover-lift shadow-card-soft transition-shadow",
        toneClasses[tone],
        className,
      )}
    >
      <CardHeader className="pb-2">
        <CardDescription className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
          {value}
        </p>
        {hint ? (
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
