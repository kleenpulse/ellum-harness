"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { circle } from "./styles";

/** Paper ↔ Night. Icons and labels swap in CSS: resolvedTheme is unknown during SSR. */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            aria-label="Switch theme"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className={cn(circle, "text-ink-2 hover:bg-card hover:text-foreground dark:hover:bg-accent", className)}
          />
        }
      >
        <Sun className="hidden dark:block" />
        <Moon className="dark:hidden" />
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={12}>
        <span className="dark:hidden">Switch to dark</span>
        <span className="hidden dark:inline">Switch to light</span>
      </TooltipContent>
    </Tooltip>
  );
}
