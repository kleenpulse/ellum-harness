"use client";

import { AnimatePresence, motion } from "motion/react";
import { useOffline } from "next/offline";
import { SPRING_POP } from "@/lib/motion";
import { useReducedMotionPref } from "@/lib/use-reduced-motion";

/** Floating glass pill while the app is offline; Next retries pending requests on reconnect. */
export function OfflineBanner() {
  const isOffline = useOffline();
  const reduce = useReducedMotionPref();

  return (
    <div role="status" className="pointer-events-none fixed inset-x-3 top-3 z-50 flex justify-center">
      <AnimatePresence>
        {isOffline ? (
          <motion.div
            initial={{ opacity: 0, y: reduce ? 0 : -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduce ? 0 : -12 }}
            transition={SPRING_POP}
            className="glass pointer-events-auto flex h-9 items-center gap-2.5 rounded-pill px-4 text-[13px] text-ink shadow-lift ring-1 ring-border dark:ring-glass-border"
          >
            <span aria-hidden className="size-2 animate-pulse rounded-full bg-warn" />
            <span className="whitespace-nowrap">
              You&apos;re offline<span className="hidden sm:inline">. Changes will send when you reconnect.</span>
            </span>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
