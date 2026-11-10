// How the Bots page is laid out. A plain module, not a "use client" one: the
// page (server) reads the cookie and the toolbar (client) writes it.

export type BotsView = "list" | "cards";

export const BOTS_VIEW_COOKIE = "ellum-bots-view";

/** Bots per page, in either view. Fills a 3x2 or 2x3 card grid. */
export const PAGE_SIZE = 6;

/** Anything but an explicit "cards" is the list. */
export function parseView(value: string | undefined | null): BotsView {
  return value === "cards" ? "cards" : "list";
}

/** Remembers the chosen view for a year, site-wide. Browser only. */
export function saveBotsView(view: BotsView) {
  document.cookie = `${BOTS_VIEW_COOKIE}=${view}; path=/; max-age=31536000; samesite=lax`;
}

/** The Bots page URL for a search and a page; defaults are left out. */
export function botsHref(query: string, page = 1): string {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (page > 1) params.set("page", String(page));
  const search = params.toString();
  return search ? `/bots?${search}` : "/bots";
}
