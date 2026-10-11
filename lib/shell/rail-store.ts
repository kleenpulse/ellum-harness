import { parseRail, RAIL_COOKIE, railCookie } from "./rail";

// The rail's live state. The source of truth is <html data-rail> (see
// RAIL_PREPAINT); this store lets React read and change it. Browser-only.

const listeners = new Set<() => void>();
let lock: string | null = null;

export function subscribeRail(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const readRail = () => document.documentElement.dataset.rail === "open";

function paint(open: boolean) {
  document.documentElement.dataset.rail = open ? "open" : "closed";
  for (const listener of listeners) listener();
}

/** The user's choice: persisted, and shown unless something holds the rail shut. */
export function writeRail(open: boolean) {
  if (lock) return;
  document.cookie = railCookie(open);
  paint(open);
}

/** Why the rail is held shut, to tell someone who tries to open it; null when it's free. */
export const railLock = () => lock;

/**
 * Holds the rail collapsed (and ignores toggles) without touching the saved
 * preference; `null` unlocks and restores it. For views that need the width.
 * `reason` says how to get the rail back.
 */
export function lockRail(reason: string | null) {
  if (lock === reason) return;
  lock = reason;
  const saved = document.cookie.match(new RegExp(`(?:^|; )${RAIL_COOKIE}=([^;]*)`))?.[1];
  paint(!lock && parseRail(saved));
}
