"use client";

import { useRouter } from "@bprogress/next/app";
import { useEffect, useState } from "react";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const pad = (n: number) => String(n).padStart(2, "0");

/** "11d 04h 09m"; seconds only in the last hour. */
function left(ms: number) {
  const d = Math.floor(ms / DAY);
  const h = Math.floor((ms % DAY) / HOUR);
  const m = Math.floor((ms % HOUR) / MINUTE);
  const s = Math.floor((ms % MINUTE) / 1000);
  if (d > 0) return `${d}d ${pad(h)}h ${pad(m)}m`;
  if (h > 0) return `${h}h ${pad(m)}m`;
  return `${m}m ${pad(s)}s`;
}

/**
 * Live time until the period ends. Starts from the server's clock so the first
 * paint matches, then ticks; at zero the page reloads into the new period.
 */
export function ResetCountdown({ end, now }: { end: string; now: number }) {
  const router = useRouter();
  const target = new Date(end).getTime();
  const [current, setCurrent] = useState(now);
  const ms = Math.max(0, target - current);

  useEffect(() => {
    const tick = setInterval(() => setCurrent(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    if (ms === 0) router.refresh();
  }, [ms, router]);

  return (
    <time dateTime={end} className="tabular">
      {left(ms)}
    </time>
  );
}
