import type * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Empty / fault state: two hairline rings around a recessed core and a single
 * dot (or custom `media`, e.g. an AvatarStage), then a title, a line of body,
 * and an optional action.
 */
export function PaneState({
  tone = "signal",
  media,
  title,
  children,
  action,
  className,
}: {
  tone?: "signal" | "critical";
  media?: React.ReactNode;
  title: React.ReactNode;
  children?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-1 flex-col items-center justify-center px-8 py-14 text-center", className)}>
      {media ?? (
        <div aria-hidden className="relative grid size-20 place-items-center">
          <span className="absolute inset-0 rounded-full ring-1 ring-border dark:ring-glass-border" />
          <span className="absolute inset-4 rounded-full ring-1 ring-border dark:ring-glass-border" />
          <span className="grid size-8 place-items-center rounded-full bg-card-nested ring-1 ring-border dark:ring-glass-border">
            <span className={cn("size-2 rounded-full", tone === "critical" ? "bg-critical" : "bg-signal")} />
          </span>
        </div>
      )}
      <h2 className="mt-6 font-display text-xl leading-tight tracking-[-0.01em] text-ink">{title}</h2>
      {children ? <div className="mt-2 max-w-xs text-[13px] leading-relaxed text-ink-2">{children}</div> : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
