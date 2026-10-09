import type * as React from "react";
import { cn } from "@/lib/utils";

/*
  Every page's frame: a header on the canvas (title, subtitle, the page's own
  actions), an optional intro band (a hero, a StatStrip), then the rounded
  sheet that rises to hold the page's bento cards.

  The sheet body is an @container. Pages that want columns wrap their own
  `grid grid-cols-12` and span with container variants (`@3xl:`, `@board:`),
  never viewport breakpoints — the rail eats 84px the viewport doesn't know about.
*/

/** Page width cap, net of the 84px rail. */
export const PAGE_COLUMN = "mx-auto w-full max-w-[calc(1900px-84px)] px-5 md:px-8";

export function PageFrame({
  title,
  subtitle,
  actions,
  intro,
  sheetClassName,
  children,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** The page's own controls, right of the title. */
  actions?: React.ReactNode;
  /** Between header and sheet: a hero, or a strip of stat tiles. */
  intro?: React.ReactNode;
  sheetClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh flex-col">
      <div className={cn(PAGE_COLUMN, "pt-6", intro ? "pb-10" : "pb-6")}>
        <header className="entrance flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="truncate font-display text-[22px] leading-tight tracking-[-0.01em] text-ink">{title}</h1>
            {subtitle ? <p className="truncate text-[13px] text-ink-2">{subtitle}</p> : null}
          </div>
          {actions ? <div className="flex shrink-0 items-center gap-3">{actions}</div> : null}
        </header>
        {intro ? <div className="mt-9">{intro}</div> : null}
      </div>

      <div className="flex-1 rounded-t-frame bg-sheet dark:border-t dark:border-glass-border">
        {/* pb-28 clears the fixed mobile tab bar inside the sheet, so no canvas strip shows below it */}
        <div className={cn(PAGE_COLUMN, "@container flex flex-col gap-4 pt-6 pb-28 md:py-8", sheetClassName)}>
          {children}
        </div>
      </div>
    </div>
  );
}

/** Section heading inside a sheet — title left, a quiet note right. */
export function SheetHeading({ title, note }: { title: React.ReactNode; note?: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-1">
      <h2 className="font-display text-[17px] leading-tight tracking-[-0.01em] text-ink">{title}</h2>
      {note ? <p className="text-[12px] text-ink-2">{note}</p> : null}
    </div>
  );
}
