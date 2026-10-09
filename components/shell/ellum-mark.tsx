import { cn } from "@/lib/utils";

/**
 * The "e" drawn as geometry, not type: one stroke for the bowl, one for the bar.
 * Shared shape with app/icon.svg and public/logo.svg — change all three together.
 */
export function EllumGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      aria-hidden
      className={className}
    >
      <path d="M5 12H19A7 7 0 1 0 16.95 16.95" />
    </svg>
  );
}

/** The brand disc at the top of the rail: ink in Paper, a lit blue ring in Night. */
export function EllumMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-11 place-items-center rounded-full bg-inverse text-inverse-foreground",
        "dark:bg-signal-soft dark:text-signal dark:shadow-glow",
        className,
      )}
    >
      <EllumGlyph className="size-5" />
    </span>
  );
}
