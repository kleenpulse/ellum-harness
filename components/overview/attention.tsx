import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { Bento, BentoTitle, Caption, StatTile, Well } from "@/components/ui/bento";
import { cn } from "@/lib/utils";
import { getAttention, getSandboxStatuses } from "@/queries/overview";

const pulse = "animate-pulse rounded-pill bg-foreground/8";

/** Stands in for a stat tile's figure while it streams. */
export function TileFallback({ label, i }: { label: string; i: number }) {
  return (
    <StatTile
      i={i}
      label={label}
      value={<span aria-hidden className={cn(pulse, "my-0.5 h-5 w-8")} />}
      sub={<span aria-hidden className={cn(pulse, "block h-3 w-24")} />}
    />
  );
}

export async function SandboxesTile({ i }: { i: number }) {
  const { available, byBot } = await getSandboxStatuses();
  const all = Object.values(byBot).filter((s) => s.label !== "No sandbox");
  const live = all.filter((s) => s.live).length;
  return (
    <StatTile
      i={i}
      label="Sandboxes awake"
      value={available ? live : "—"}
      dot={available && live > 0 ? "signal" : undefined}
      sub={
        !available
          ? "Couldn't check right now"
          : all.length
            ? `of ${all.length}; the rest wake on use`
            : "A bot's sandbox wakes on use"
      }
    />
  );
}

export async function AttentionTile({ i }: { i: number }) {
  const items = await getAttention();
  const urgent = items.some((item) => item.tone === "critical");
  return (
    <StatTile
      i={i}
      label="Needs attention"
      value={items.length}
      dot={items.length === 0 ? "mute" : urgent ? "critical" : undefined}
      sub={items.length ? items[0].text : "All quiet"}
    />
  );
}

export function AttentionFallback({ i }: { i?: number }) {
  return (
    <Bento i={i} className="flex flex-col gap-4">
      <BentoTitle>Needs attention</BentoTitle>
      <Well aria-hidden className="flex flex-col gap-3">
        <span className={cn(pulse, "h-3 w-4/5")} />
        <span className={cn(pulse, "h-3 w-3/5")} />
      </Well>
    </Bento>
  );
}

/** Only what needs the user: sandbox faults, bots that can't work, limits close to used up. */
export async function AttentionCard({ i }: { i?: number }) {
  const [items, { available }] = await Promise.all([getAttention(), getSandboxStatuses()]);

  return (
    <Bento i={i} className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <BentoTitle>Needs attention</BentoTitle>
        {items.length ? <Caption className="tabular">{items.length}</Caption> : null}
      </div>
      {items.length ? (
        <Well className="flex flex-col divide-y divide-border overflow-hidden p-0 dark:divide-glass-border">
          {items.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="flex items-center gap-3 px-4 py-3 outline-none transition-colors duration-200 ease-swell hover:bg-accent focus-visible:bg-accent"
            >
              <span
                aria-hidden
                className={cn("size-2 shrink-0 rounded-full", item.tone === "critical" ? "bg-critical" : "bg-warn")}
              />
              <span className="min-w-0 flex-1 text-[13px] leading-snug text-ink">{item.text}</span>
              <ChevronRight aria-hidden className="size-4 shrink-0 text-ink-3" />
            </Link>
          ))}
        </Well>
      ) : (
        <Well className="flex items-center gap-3">
          <span aria-hidden className="size-2 shrink-0 rounded-full bg-ok" />
          <span className="text-[13px] text-ink-2">All quiet. Nothing needs you right now.</span>
        </Well>
      )}
      {available ? null : <Caption>Sandbox status couldn&apos;t be checked just now.</Caption>}
    </Bento>
  );
}
