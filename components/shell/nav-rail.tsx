"use client";

import { UserButton } from "@clerk/nextjs";
import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SPRING_DETENT } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { EllumMark } from "./ellum-mark";
import { isActive, NAV } from "./nav";
import { circle } from "./styles";
import { ThemeToggle } from "./theme-toggle";

/** The 84px icon rail (md and up). Below md, MobileTabBar takes over. */
export function NavRail({ className }: { className?: string }) {
  const pathname = usePathname();
  const indicatorId = useId();

  return (
    <nav
      aria-label="Primary"
      className={cn(
        "sticky top-0 z-10 h-svh w-[84px] shrink-0 flex-col items-center gap-4 bg-band py-5",
        "dark:border-r dark:border-glass-border",
        className,
      )}
    >
      <Link href="/" aria-label="Ellum home" className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <EllumMark />
      </Link>

      <div className="mt-2 flex flex-col gap-1.5 rounded-full bg-sheet p-1.5 ring-1 ring-border dark:bg-card-nested dark:ring-glass-border">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Tooltip key={href}>
              <TooltipTrigger
                render={
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      circle,
                      "isolate",
                      active
                        ? "text-inverse-foreground dark:text-signal"
                        : "text-ink-2 hover:bg-card hover:text-foreground dark:hover:bg-accent",
                    )}
                  />
                }
              >
                {active && (
                  <motion.span
                    layoutId={indicatorId}
                    aria-hidden
                    transition={SPRING_DETENT}
                    className="absolute inset-0 -z-10 rounded-full bg-inverse dark:bg-signal-soft dark:shadow-glow"
                  />
                )}
                <Icon strokeWidth={1.75} />
                <span className="sr-only">{label}</span>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={12}>
                {label}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>

      <div className="mt-auto flex flex-col items-center gap-3">
        <ThemeToggle />
        <div className="grid size-11 place-items-center">
          <UserButton />
        </div>
      </div>
    </nav>
  );
}
