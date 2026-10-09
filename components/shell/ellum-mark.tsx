import { cn } from "@/lib/utils";

/**
 * A kite on its line: the bot flies, the harness holds the string, and the
 * string loops once into a cursive "e". Line takes currentColor, kite is signal.
 * Shared shape with app/icon.svg, public/logo.svg and public/logo-lockup-{light,dark}.svg —
 * change them together.
 */
export function EllumGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="1.4 -0.6 24 24" fill="none" aria-hidden className={className}>
      <path d="M17.5 10.4L16.1 4.1L20.4 1.6L22.6 6.1Z" className="fill-signal" />
      <path
        d="M3.8 19.8C7 19.2 10.6 16.4 12.4 13.2C13.6 11 12.8 8.6 10.8 8.8C8.8 9 8.2 11.8 9.2 14C10.4 16.6 14 17 16.2 14.4C17.2 13.2 17.5 11.8 17.5 10.4"
        stroke="currentColor"
        strokeWidth={2.3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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
        "dark:bg-signal-soft dark:text-foreground dark:shadow-glow",
        className,
      )}
    >
      {/* Proportional, so the glyph follows the disc when it resizes. */}
      <EllumGlyph className="size-[73%]" />
    </span>
  );
}
