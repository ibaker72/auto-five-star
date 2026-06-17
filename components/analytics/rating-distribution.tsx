import { cn } from "@/lib/utils";

type Props = {
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
};

export function RatingDistribution({ distribution }: Props) {
  const max = Math.max(
    distribution[1],
    distribution[2],
    distribution[3],
    distribution[4],
    distribution[5],
    1,
  );
  return (
    <div className="space-y-1.5">
      {[5, 4, 3, 2, 1].map((rating) => {
        const r = rating as 1 | 2 | 3 | 4 | 5;
        const count = distribution[r];
        const pct = Math.round((count / max) * 100);
        const bar =
          rating <= 2
            ? "bg-rose-400"
            : rating === 3
              ? "bg-amber-400"
              : "bg-emerald-500";
        return (
          <div key={rating} className="flex items-center gap-2 text-xs">
            <div className="w-10 text-right text-muted-foreground">
              {rating}★
            </div>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
              <div
                className={cn("h-full", bar)}
                style={{ width: `${pct}%` }}
                aria-hidden="true"
              />
            </div>
            <div className="w-8 text-right tabular-nums">{count}</div>
          </div>
        );
      })}
    </div>
  );
}
