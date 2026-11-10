"use client";

import { Button } from "@/components/ui/button";
import { requestChangelogOpen } from "@/components/whats-new/store";
import { EntryList, useReleases } from "@/components/whats-new/whats-new";
import { APP_VERSION } from "@/lib/changelog/seen";

/** Entries of the latest release shown here; the rest are in the full changelog. */
const SHOWN = 4;

export function About() {
  const latest = useReleases()[0];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] text-ink-2">You&apos;re on this version of Ellum.</p>
        <Button variant="surface" size="pill-sm" onClick={() => requestChangelogOpen()}>
          <span className="font-mono tabular">v{APP_VERSION}</span>
        </Button>
      </div>
      {latest ? (
        <div className="flex flex-col gap-3 well p-4">
          <h3 className="flex items-baseline gap-2 text-[14px] font-medium text-foreground">
            What&apos;s new in v{latest.version}
            {latest.date && <span className="readout">{latest.date}</span>}
          </h3>
          <EntryList entries={latest.entries.slice(0, SHOWN)} />
          <Button variant="surface" size="pill-sm" className="w-fit" onClick={() => requestChangelogOpen()}>
            {latest.entries.length > SHOWN ? `All ${latest.entries.length} changes` : "Full changelog"}
          </Button>
        </div>
      ) : (
        <p className="text-[13px] text-ink-2">No releases yet.</p>
      )}
    </div>
  );
}
