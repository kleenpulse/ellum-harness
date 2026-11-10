import type * as React from "react";
import { cn } from "@/lib/utils";

/** A group of settings: put `SettingRow`s inside. Its own container, so rows stack by the card's width. */
export function SettingList({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "well @container flex min-w-0 flex-col divide-y divide-border overflow-hidden dark:divide-glass-border",
        className,
      )}
      {...props}
    />
  );
}

/** One setting: what it is and a line of help on the left, its control on the right (below, when narrow). */
export function SettingRow({
  title,
  help,
  children,
  className,
}: {
  title: React.ReactNode;
  help?: React.ReactNode;
  /** The control. */
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 px-4 py-3.5 @md:flex-row @md:items-center @md:justify-between @md:gap-6",
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[13.5px] font-medium text-ink">{title}</span>
        {help ? <span className="text-[12.5px] leading-snug text-ink-2">{help}</span> : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">{children}</div>
    </div>
  );
}
