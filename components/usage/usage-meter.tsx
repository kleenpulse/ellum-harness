import { cn } from "@/lib/utils";

/** Where a meter turns amber; full is critical. */
const WARN_AT = 0.8;

/** One limit: what's used of it, as a bar with the figures above it. */
export function UsageMeter({
  label,
  used,
  limit,
  format,
  note,
}: {
  label: string;
  used: number;
  limit: number;
  /** Renders an amount in the meter's unit. */
  format: (n: number) => string;
  note?: string;
}) {
  const share = limit > 0 ? Math.min(1, used / limit) : 1;
  const tone = share >= 1 ? "critical" : share >= WARN_AT ? "warn" : "signal";

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="readout">{label}</span>
        <span className="text-[12px] text-ink-3">{format(Math.max(0, limit - used))} left</span>
      </div>
      <div className="tabular font-display text-kpi-sm leading-none tracking-[-0.02em] text-ink">
        {format(used)}
        <span className="text-ink-3"> / {format(limit)}</span>
      </div>
      <div
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-valuenow={Math.min(used, limit)}
        aria-valuetext={`${format(used)} of ${format(limit)}`}
        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-500 ease-swell",
            tone === "signal" && "bg-signal",
            tone === "warn" && "bg-warn",
            tone === "critical" && "bg-critical",
          )}
          style={{ width: `${share * 100}%` }}
        />
      </div>
      {note ? <p className="text-[12px] text-ink-2">{note}</p> : null}
    </div>
  );
}
