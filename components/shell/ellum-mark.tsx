import { cn } from "@/lib/utils";

/** The brand disc at the top of the rail: ink in Paper, a lit blue ring in Night. */
export function EllumMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-11 place-items-center rounded-full bg-inverse font-display text-[19px] leading-none text-inverse-foreground",
        "dark:bg-signal-soft dark:text-signal dark:shadow-glow",
        className,
      )}
    >
      e
    </span>
  );
}
