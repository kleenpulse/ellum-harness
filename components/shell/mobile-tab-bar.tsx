"use client";

import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { isActive, NAV } from "./nav";
import { ThemeToggle } from "./theme-toggle";

const item =
  "relative inline-flex size-10 shrink-0 items-center justify-center rounded-full text-ink-2 transition-colors [&_svg]:size-[18px]";

/** Below md the rail becomes a floating glass tab bar. */
export function MobileTabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="glass fixed inset-x-3 bottom-3 z-30 flex h-16 items-center justify-between rounded-full px-3 shadow-lift md:hidden"
    >
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(item, active && "bg-primary text-primary-foreground dark:bg-signal-soft dark:text-signal")}
          >
            <Icon strokeWidth={1.75} />
            <span className="sr-only">{label}</span>
          </Link>
        );
      })}
      <ThemeToggle className="size-10" />
      <div className="grid size-10 place-items-center">
        <UserButton />
      </div>
    </nav>
  );
}
