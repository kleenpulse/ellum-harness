"use client";

import { motion, useSpring, useTransform, type MotionValue } from "motion/react";
import { useEffect, useRef } from "react";
import { useReducedMotionPref } from "@/lib/use-reduced-motion";
import { cn } from "@/lib/utils";

const FOLLOW = { stiffness: 140, damping: 18, mass: 0.6 };

/** Shift a layer by `depth` px per unit of pointer offset: the deeper, the further it travels. */
function useDepth(v: MotionValue<number>, depth: number) {
  return useTransform(v, (n) => n * depth);
}

/**
 * A gaze avatar inside the PaneState rings, as parallax layers that lean toward
 * the cursor; the avatar's eyes (`.dbga-look`) track it too. Fine pointers only,
 * still under reduced motion.
 */
export function AvatarStage({ svg, className }: { svg: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotionPref();
  // -1…1 on each axis: the pointer's direction from the stage, eased by distance
  const x = useSpring(0, FOLLOW);
  const y = useSpring(0, FOLLOW);

  useEffect(() => {
    if (reduced || !window.matchMedia("(pointer: fine)").matches) return;
    const onMove = (e: PointerEvent) => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      const dist = Math.hypot(dx, dy) || 1;
      const reach = Math.min(dist / 320, 1);
      x.set((dx / dist) * reach);
      y.set((dy / dist) * reach);
    };
    const onLeave = () => {
      x.set(0);
      y.set(0);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, [reduced, x, y]);

  const outerX = useDepth(x, 3);
  const outerY = useDepth(y, 3);
  const innerX = useDepth(x, 6);
  const innerY = useDepth(y, 6);
  const faceX = useDepth(x, 10);
  const faceY = useDepth(y, 10);
  const tilt = useDepth(x, 6);

  return (
    <div ref={ref} aria-hidden className={cn("relative grid size-32 place-items-center", className)}>
      <motion.span
        style={{ x: outerX, y: outerY }}
        className="absolute inset-0 rounded-full ring-1 ring-border dark:ring-glass-border"
      />
      <motion.span
        style={{ x: innerX, y: innerY }}
        className="absolute inset-5 rounded-full bg-signal-soft/40 ring-1 ring-border dark:ring-glass-border"
      />
      <motion.div
        style={{ x: faceX, y: faceY, rotate: tilt, ["--gx" as string]: x, ["--gy" as string]: y }}
        className="gaze-eyes relative size-16 [&_svg]:size-full"
        // Generated locally by DiceBear from a seed: trusted markup.
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </div>
  );
}
