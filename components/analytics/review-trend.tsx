type TrendPoint = {
  weekStart: Date | string;
  count: number;
  avgRating: number | null;
};

type Props = {
  trend: TrendPoint[];
};

export function ReviewTrend({ trend }: Props) {
  const max = Math.max(...trend.map((b) => b.count), 1);
  return (
    <div>
      <div className="grid grid-cols-8 items-end gap-1 h-24">
        {trend.map((b, i) => {
          const height = Math.round((b.count / max) * 100);
          const label = new Date(b.weekStart).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          });
          return (
            <div
              key={i}
              className="flex h-full flex-col items-center justify-end"
              title={`${label}: ${b.count} review${b.count === 1 ? "" : "s"}`}
            >
              <div
                className="w-full rounded-t bg-primary/80"
                style={{ height: `${Math.max(height, 2)}%` }}
                aria-hidden="true"
              />
            </div>
          );
        })}
      </div>
      <div className="mt-1 grid grid-cols-8 text-[10px] text-muted-foreground">
        {trend.map((b, i) => (
          <div key={i} className="truncate text-center">
            {new Date(b.weekStart).toLocaleDateString(undefined, {
              month: "numeric",
              day: "numeric",
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
