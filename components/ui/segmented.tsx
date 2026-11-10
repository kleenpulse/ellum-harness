"use client";

import type { LucideIcon } from "lucide-react";
import { useRef } from "react";
import { Tip, TooltipGroup } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type SegmentedOption<T extends string> = { value: T; label: string; icon?: LucideIcon };

/**
 * One choice out of a few, as a pill track: the theme, a view, a mode. A radio
 * group, so arrow keys move the choice. `iconOnly` shows just the icons, with
 * the labels as tooltips. `value` may be undefined while the real one is not
 * known yet (a theme before hydration): nothing is selected, nothing jumps.
 */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  iconOnly = false,
  disabled = false,
  className,
}: {
  /** Names the group for screen readers. */
  label: string;
  options: readonly SegmentedOption<T>[];
  value: T | undefined;
  /** `element` is the chosen segment, for effects that grow out of it. */
  onChange: (value: T, element: HTMLButtonElement) => void;
  iconOnly?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const track = useRef<HTMLDivElement>(null);
  const current = options.findIndex((option) => option.value === value);

  function onKeyDown(event: React.KeyboardEvent) {
    const step =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? -1
          : 0;
    if (!step) return;
    event.preventDefault();
    const next = (Math.max(current, 0) + step + options.length) % options.length;
    const element = track.current?.querySelectorAll<HTMLButtonElement>("[role=radio]")[next];
    if (!element) return;
    element.focus();
    onChange(options[next].value, element);
  }

  const segments = options.map((option, index) => {
    const active = index === current;
    const Icon = option.icon;
    const props = {
      type: "button",
      role: "radio",
      "aria-checked": active,
      "aria-label": iconOnly ? option.label : undefined,
      // Roving focus: Tab lands on the choice (the first segment when there is none).
      tabIndex: active || (current === -1 && index === 0) ? 0 : -1,
      disabled,
      onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
        if (!active) onChange(option.value, event.currentTarget);
      },
      className: cn(
        "flex h-8 items-center justify-center gap-1.5 rounded-pill text-[13px] font-medium whitespace-nowrap outline-none transition-colors duration-200 ease-swell focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
        iconOnly ? "w-10" : "px-3.5",
        active
          ? "bg-primary text-primary-foreground dark:bg-signal-soft dark:text-ink dark:shadow-glow"
          : "text-ink-2 hover:bg-accent hover:text-ink",
      ),
    } satisfies React.ComponentProps<"button">;
    const content = (
      <>
        {Icon ? <Icon aria-hidden className="size-4" /> : null}
        {iconOnly ? null : option.label}
      </>
    );
    return iconOnly ? (
      <Tip key={option.value} label={option.label} render={<button {...props} />}>
        {content}
      </Tip>
    ) : (
      <button key={option.value} {...props}>
        {content}
      </button>
    );
  });

  return (
    <div
      ref={track}
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cn(
        "flex w-fit items-center gap-0.5 rounded-pill bg-card-nested p-1 ring-1 ring-border dark:ring-glass-border",
        className,
      )}
    >
      {iconOnly ? <TooltipGroup>{segments}</TooltipGroup> : segments}
    </div>
  );
}
