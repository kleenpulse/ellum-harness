"use client";

import { Moon, Sun } from "lucide-react";
import type * as React from "react";
import { useTheme } from "next-themes";
import { Tip } from "@/components/ui/tooltip";
import { runThemeTransition } from "@/lib/theme-transition";
import { cn } from "@/lib/utils";
import { circle, railRow } from "./styles";

/**
 * Paper ↔ Night, revealed as a circle growing from the button (Shadow Garden's
 * toggle). Icons and labels swap in CSS: resolvedTheme is unknown during SSR.
 */
export function ThemeToggle({
  className,
  tip = true,
  label,
}: {
  /** On the icon circle. */
  className?: string;
  tip?: boolean;
  /** Rendered inside the button beside the circle, so the whole row toggles. */
  label?: React.ReactNode;
}) {
  const { resolvedTheme, setTheme } = useTheme();
  const icons = (
    <>
      <Sun className="hidden dark:block" />
      <Moon className="dark:hidden" />
    </>
  );

  return (
    <Tip
      label={
        <>
          <span className="dark:hidden">Switch to dark</span>
          <span className="hidden dark:inline">Switch to light</span>
        </>
      }
      disabled={!tip}
      render={
          <button
            type="button"
            aria-label="Switch theme"
            onClick={(e) => {
              const next = resolvedTheme === "dark" ? "light" : "dark";
              runThemeTransition({
                // The reveal grows from the icon circle, not the middle of the row.
                triggerEl: label ? (e.currentTarget.firstElementChild as HTMLElement) : e.currentTarget,
                applyTheme: () => {
                  setTheme(next);
                  // next-themes sets the class in an effect, after the snapshot; set it now.
                  document.documentElement.classList.toggle("dark", next === "dark");
                },
              });
            }}
            className={
              label
                ? railRow
                : cn(circle, "text-ink-2 hover:bg-card hover:text-foreground dark:hover:bg-accent", className)
            }
          />
        }
      >
        {label ? (
          <>
            <span className={cn(circle, "text-ink-2 group-hover:text-foreground", className)}>{icons}</span>
            {label}
          </>
        ) : (
          icons
        )}
    </Tip>
  );
}
