"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  AnimatePresence,
  MotionConfig,
  motion,
  type Transition,
} from "motion/react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useReducedMotionPref } from "@/lib/use-reduced-motion";
import { cn } from "@/lib/utils";

// Source: shadow-garden components/registry/grow-dialog, restyled onto Ellum tokens.

/**
 * Grow-from-trigger dialog: pass the clicked element's
 * `getBoundingClientRect()` as `originRect` and the panel scales + translates
 * from that rect to the centered dialog — and shrinks back into it on close.
 * The whole animation stays inside the portal at z-50, so it never travels
 * behind page content, and the trigger itself never animates (it is only a
 * coordinate source). This is the canonical choice for "a small button opens
 * a big dialog" — no shared-layout ids, no aspect-ratio distortion, no
 * clipping in either direction.
 *
 * Omit `originRect` (or reduced motion) → a plain centered fade+scale pop.
 * Keep the panel MOUNTED (`<GrowDialog open={open} …/>`, never
 * `{open && <GrowDialog/>}`) or the exit animation can't play.
 */

const noop = () => () => {};

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export interface GrowPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Grow the panel from this viewport rect (a trigger's
   * getBoundingClientRect). Dropped under reduced motion (centered fade).
   */
  originRect?: DOMRect | null;
  /**
   * The panel's max rendered width in px (matches the `className` max-w-*).
   * Only sizes the collapsed scale, so approximate is fine. Defaults to 448.
   */
  originMaxWidth?: number;
  /** Spring stiffness of the grow. */
  stiffness?: number;
  /** Spring damping — lower rings longer. */
  damping?: number;
  /** Panel corner radius in px. */
  radius?: number;
  /** Frosted blur on the backdrop scrim. */
  blurBackdrop?: boolean;
  /**
   * Focus the first focusable element on open (default). Pass false when that
   * element is a text input on mobile — autofocus pops the virtual keyboard.
   */
  autoFocus?: boolean;
  /**
   * False: Escape and backdrop clicks don't close it, only an explicit close
   * does. For panels hosting input-hungry content (a remote desktop).
   */
  dismissible?: boolean;
  /**
   * Replaces the backdrop's visual classes. The element itself always renders —
   * pass `bg-transparent` for an invisible click-to-close layer.
   */
  backdropClassName?: string;
  /** Inline styles for the panel element. */
  style?: CSSProperties;
  /** Fires when the panel's enter OR exit animation completes. */
  onAnimationComplete?: () => void;
  className?: string;
  children: ReactNode;
  reducedMotion?: boolean;
  /** Dialog semantics — pass `'alertdialog'` for destructive confirmations. */
  role?: "dialog" | "alertdialog";
  "aria-label"?: string;
  "aria-describedby"?: string;
}

export function GrowPanel({
  open,
  onOpenChange,
  originRect,
  originMaxWidth,
  stiffness = 320,
  damping = 34,
  radius = 16,
  blurBackdrop = true,
  autoFocus = true,
  dismissible = true,
  backdropClassName,
  style,
  onAnimationComplete,
  className,
  children,
  reducedMotion = false,
  role = "dialog",
  "aria-label": ariaLabel,
  "aria-describedby": ariaDescribedby,
}: GrowPanelProps) {
  // False during SSR and hydration, true after: the portal needs document.body.
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  const containerRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (open) openerRef.current = document.activeElement as HTMLElement | null;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        // If a nested overlay is open, let it own Escape — both listeners live
        // on `document` and ours fires first, so without this guard one
        // keystroke would close both. Any other open aria-modal dialog wins.
        const dialogs = document.querySelectorAll(
          '[role="dialog"][aria-modal="true"]',
        );
        if (Array.from(dialogs).some((node) => node !== containerRef.current)) {
          return;
        }
        event.preventDefault();
        if (dismissible) onOpenChange(false);
        return;
      }
      if (event.key !== "Tab") return;
      const focusables =
        containerRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (!focusables || focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange, dismissible]);

  useEffect(() => {
    if (!open) return;
    document.body.classList.add("overflow-hidden");
    if (autoFocus) {
      containerRef.current
        ?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)?.[0]
        ?.focus();
    }
    return () => document.body.classList.remove("overflow-hidden");
  }, [open, autoFocus]);

  useEffect(() => {
    if (!open) openerRef.current?.focus?.();
  }, [open]);

  const transition = useMemo<Transition>(
    () => ({ type: "spring", stiffness, damping, mass: 0.8 }),
    [stiffness, damping],
  );

  // "Grow from a trigger" transform. The fully-open panel is centered, so its
  // center IS the viewport center — only the trigger's offset from center and
  // a width-based scale are needed. The same object drives `initial` and
  // `exit`, so the grow-in and shrink-out are perfectly symmetric.
  const growFrom = useMemo(() => {
    if (!originRect || reducedMotion || typeof window === "undefined")
      return null;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const panelW = Math.min(originMaxWidth ?? 448, vw - 32); // container p-4 = 16px/side
    const x = originRect.left + originRect.width / 2 - vw / 2;
    const y = originRect.top + originRect.height / 2 - vh / 2;
    const scale = Math.min(0.9, Math.max(0.1, originRect.width / panelW));
    return { opacity: 0, x, y, scale };
  }, [originRect, reducedMotion, originMaxWidth]);

  if (!mounted) return null;

  const fade = {
    initial: { opacity: 0, scale: 0.96 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.96 },
  };

  return createPortal(
    <MotionConfig transition={reducedMotion ? { duration: 0 } : transition}>
      <AnimatePresence initial={false} mode="sync">
        {open && (
          <>
            <motion.div
              key="grow-backdrop"
              className={cn(
                "fixed inset-0 z-40 h-full w-full",
                backdropClassName ??
                  cn(
                    "bg-background/60",
                    blurBackdrop && "backdrop-blur-xs",
                  ),
              )}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => dismissible && onOpenChange(false)}
            />
            <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                ref={containerRef}
                initial={growFrom ?? fade.initial}
                animate={
                  growFrom ? { opacity: 1, x: 0, y: 0, scale: 1 } : fade.animate
                }
                exit={growFrom ?? fade.exit}
                style={{ borderRadius: radius, ...style }}
                onAnimationComplete={onAnimationComplete}
                role={role}
                aria-modal="true"
                aria-label={ariaLabel}
                aria-describedby={ariaDescribedby}
                className={cn("pointer-events-auto overflow-hidden", className)}
              >
                {children}
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </MotionConfig>,
    document.body,
  );
}

export interface GrowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
  /** The clicked trigger's getBoundingClientRect — the grow origin. */
  originRect?: DOMRect | null;
  /** Panel's max rendered width in px (match the `className` max-w-*). */
  originMaxWidth?: number;
  stiffness?: number;
  damping?: number;
  radius?: number;
  blurBackdrop?: boolean;
  autoFocus?: boolean;
  /** False: only the close button closes it (no Escape, no backdrop click). */
  dismissible?: boolean;
  /** Force reduced motion (OS preference is honored automatically). */
  reducedMotion?: boolean;
  role?: "dialog" | "alertdialog";
}

/**
 * Drop-in dialog chrome on top of `GrowPanel`: title/description/close-button
 * header, content crossfading in as the box settles. Pass the trigger's rect
 * as `originRect`; omit it for a plain centered fade.
 */
export default function GrowDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
  originRect,
  originMaxWidth,
  stiffness = 320,
  damping = 34,
  radius = 16,
  blurBackdrop = true,
  autoFocus = true,
  dismissible,
  reducedMotion,
  role = "dialog",
}: GrowDialogProps) {
  const osReduce = useReducedMotionPref();
  const reduce = Boolean(osReduce) || Boolean(reducedMotion);
  const descId = useId();

  return (
    <GrowPanel
      open={open}
      onOpenChange={onOpenChange}
      originRect={originRect}
      originMaxWidth={originMaxWidth}
      stiffness={stiffness}
      damping={damping}
      radius={radius}
      blurBackdrop={blurBackdrop}
      autoFocus={autoFocus}
      dismissible={dismissible}
      reducedMotion={reduce}
      role={role}
      aria-label={title}
      aria-describedby={description ? descId : undefined}
      className={cn(
        "flex max-h-[85svh] w-full max-w-sm flex-col overflow-hidden dialog-surface shadow-lift ring-1 ring-border dark:ring-glass-border",
        className,
      )}
    >
      {/* Content crossfades in as the box settles — container grows, content fades. */}
      <motion.div
        className="flex min-h-0 flex-1 flex-col"
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={reduce ? undefined : { duration: 0.18, delay: 0.12 }}
      >
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4">
          <div className="flex flex-col gap-1">
            <h2 className="font-display text-[17px] text-ink">{title}</h2>
            {description && (
              <p id={descId} className="text-[13px] leading-relaxed text-ink-2">
                {description}
              </p>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="circle-sm"
            onClick={() => onOpenChange(false)}
            className="-mt-1.5 -mr-2.5 text-ink-3 hover:text-ink"
            aria-label="Close dialog"
          >
            <X />
          </Button>
        </div>
        {children}
      </motion.div>
    </GrowPanel>
  );
}
