// The user's motion preference, on top of the OS setting. A plain module, not
// a "use client" one: the root layout (server) inlines the prepaint script and
// Settings (client) reads and writes the store.

export type MotionPref = "system" | "reduce";

export const MOTION_COOKIE = "ellum-motion";

/** Anything but an explicit "reduce" follows the system. */
export function parseMotion(value: string | undefined | null): MotionPref {
  return value === "reduce" ? "reduce" : "system";
}

/**
 * Runs before first paint (inline in the root layout): mirrors the cookie onto
 * <html data-motion-pref="reduce">, which globals.css styles from, so a reload
 * never plays an entrance the user turned off.
 */
export const MOTION_PREPAINT = `try{if(/(?:^|; )${MOTION_COOKIE}=reduce(?:;|$)/.test(document.cookie))document.documentElement.dataset.motionPref="reduce"}catch(e){}`;

const OS_QUERY = "(prefers-reduced-motion: reduce)";
const listeners = new Set<() => void>();

/** Fires when the preference or the OS setting changes. Browser only. */
export function subscribeMotion(listener: () => void) {
  listeners.add(listener);
  const media = window.matchMedia(OS_QUERY);
  media.addEventListener("change", listener);
  return () => {
    listeners.delete(listener);
    media.removeEventListener("change", listener);
  };
}

export const readMotion = (): MotionPref => parseMotion(document.documentElement.dataset.motionPref);

/** Persists the preference for a year and applies it now. */
export function writeMotion(pref: MotionPref) {
  document.cookie = `${MOTION_COOKIE}=${pref}; path=/; max-age=31536000; samesite=lax`;
  if (pref === "reduce") document.documentElement.dataset.motionPref = "reduce";
  else delete document.documentElement.dataset.motionPref;
  for (const listener of listeners) listener();
}

/** Reduced by the user here or by the OS. The preference can only add reduction. */
export const motionReduced = (): boolean =>
  readMotion() === "reduce" || window.matchMedia(OS_QUERY).matches;
