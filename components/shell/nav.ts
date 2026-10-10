import { Bot, LayoutGrid, Settings, type LucideIcon } from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };

/** The rail's capsule. */
export const PRIMARY_NAV: NavItem[] = [
  { href: "/", label: "Overview", icon: LayoutGrid },
  { href: "/bots", label: "Bots", icon: Bot },
];

/** The rail keeps this at its foot, below the theme toggle. */
export const SETTINGS_NAV: NavItem = { href: "/settings", label: "Settings", icon: Settings };

/** Every destination, in tab-bar order. */
export const NAV: NavItem[] = [...PRIMARY_NAV, SETTINGS_NAV];

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
