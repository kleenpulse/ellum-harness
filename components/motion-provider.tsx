"use client";

import { MotionConfig } from "motion/react";
import { useReducedMotionPref } from "@/lib/use-reduced-motion";

/** Makes every motion/react animation obey the Settings motion preference, not only the OS one. */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotionPref();
  return <MotionConfig reducedMotion={reduced ? "always" : "user"}>{children}</MotionConfig>;
}
