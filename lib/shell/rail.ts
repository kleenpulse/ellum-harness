// The rail's persisted state. A plain module, not a "use client" one: the
// layout (server) reads the cookie and the rail (client) writes it.

export const RAIL_COOKIE = "ellum-rail";

/** Anything but an explicit "open" is collapsed — the 84px icon rail. */
export function parseRail(value: string | undefined | null): boolean {
  return value === "open";
}

/** The cookie the rail writes on toggle. A year, whole site. */
export function railCookie(expanded: boolean): string {
  return `${RAIL_COOKIE}=${expanded ? "open" : "closed"}; path=/; max-age=31536000; samesite=lax`;
}
