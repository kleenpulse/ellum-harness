import type * as React from "react";
import { cn } from "@/lib/utils";

/** The card every board is built from. `i` staggers its entrance. */
export function Bento({
  i = 0,
  className,
  style,
  ...props
}: React.ComponentProps<"section"> & { i?: number }) {
  return (
    <section
      className={cn("bento entrance relative min-w-0 p-5", className)}
      style={{ ["--i" as string]: i, ...style }}
      {...props}
    />
  );
}

export function BentoTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return (
    <h2
      className={cn("font-display text-[17px] leading-tight tracking-[-0.01em] text-ink", className)}
      {...props}
    />
  );
}

/** A panel recessed into a bento. */
export function Well({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("well min-w-0 p-4", className)} {...props} />;
}

/** Small mono caption — "last 7 days". */
export function Caption({ className, ...props }: React.ComponentProps<"span">) {
  return <span className={cn("font-mono text-[11px] text-ink-3", className)} {...props} />;
}

/** A mono pill label — "last 14 days". */
export function Chip({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center rounded-pill px-3 font-mono text-[11px] text-ink-2 ring-1 ring-border dark:ring-glass-border",
        className,
      )}
      {...props}
    />
  );
}

/**
 * A period-over-period move. `good` says which direction is good news for this
 * figure. Under a point either way is noise and reads neutral.
 */
export function DeltaChip({
  pct,
  good = "up",
  className,
}: {
  pct: number | null;
  good?: "up" | "down";
  className?: string;
}) {
  if (pct === null) return null;
  const favourable = Math.abs(pct) < 1 ? null : pct > 0 === (good === "up");
  return (
    <span
      className={cn(
        "tabular inline-flex h-6 items-center rounded-pill px-2 font-mono text-[11px] ring-1",
        favourable === true && "text-signal-ink ring-signal/35",
        favourable === false && "text-critical ring-critical/35",
        favourable === null && "text-ink-3 ring-border dark:ring-glass-border",
        className,
      )}
    >
      {pct > 0 ? "+" : pct < 0 ? "−" : ""}
      {Math.abs(pct)}%
    </span>
  );
}

/** Stat tile for the strip under a page header. */
export function StatTile({
  label,
  value,
  sub,
  dot,
  i = 0,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  dot?: "signal" | "critical" | "mute";
  i?: number;
}) {
  return (
    <div
      className="entrance flex min-w-0 flex-col items-start gap-1 rounded-card bg-sheet p-4 ring-1 ring-border dark:bg-card-nested dark:ring-glass-border"
      style={{ ["--i" as string]: i }}
    >
      <span className="readout">{label}</span>
      <span className="tabular flex items-center gap-2 font-display text-[20px] leading-tight tracking-[-0.01em] text-ink">
        {dot ? (
          <span
            aria-hidden
            className={cn(
              "size-2 rounded-full",
              dot === "signal" && "bg-signal",
              dot === "critical" && "bg-critical",
              dot === "mute" && "bg-ink-3",
            )}
          />
        ) : null}
        {value}
      </span>
      {sub ? <span className="w-full truncate text-[12px] text-ink-2">{sub}</span> : null}
    </div>
  );
}

export function StatStrip({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{children}</div>;
}
