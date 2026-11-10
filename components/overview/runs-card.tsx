import { Bento, Caption, DeltaChip } from "@/components/ui/bento";
import { cn } from "@/lib/utils";
import type { RunStats } from "@/queries/overview";

const runs = (n: number) => `${n} ${n === 1 ? "run" : "runs"}`;

const when = (daysAgo: number) =>
  daysAgo === 0 ? "the last 24 hours" : daysAgo === 1 ? "the 24 hours before" : `${daysAgo} days ago`;

/** The week's runs: the total, its move on the week before, and a bar per 24 hours. */
export function RunsCard({ stats, i }: { stats: RunStats; i?: number }) {
  const peak = Math.max(1, ...stats.days);
  const last = stats.days.length - 1;

  return (
    <Bento i={i} className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <span className="readout">Runs this week</span>
        <DeltaChip pct={stats.pct} />
      </div>
      <div className="flex items-baseline gap-2">
        <span className="tabular font-display text-kpi text-ink">{stats.thisWeek}</span>
        <span className="tabular text-[12px] text-ink-2">
          {stats.lastWeek ? `${stats.lastWeek} the week before` : "none the week before"}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        <ol className="flex h-16 items-end gap-1.5">
          {stats.days.map((count, day) => {
            const label = `${runs(count)} in ${when(last - day)}`;
            return (
              <li key={day} title={label} className="flex h-full flex-1 items-end">
                <span className="sr-only">{label}</span>
                <span
                  aria-hidden
                  className={cn(
                    "w-full rounded-[5px]",
                    // The live day carries the signal; an empty day keeps a hairline so the week still reads as seven.
                    count === 0 ? "bg-foreground/8" : day === last ? "bg-signal" : "bg-ink-3/45",
                  )}
                  style={{ height: count === 0 ? 3 : `${Math.max(10, (count / peak) * 100)}%` }}
                />
              </li>
            );
          })}
        </ol>
        <div className="flex items-center justify-between">
          <Caption>7 days ago</Caption>
          <Caption>now</Caption>
        </div>
      </div>
    </Bento>
  );
}
