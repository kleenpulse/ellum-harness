import { useSyncExternalStore } from "react";
import { motionReduced, subscribeMotion } from "./motion-pref";

/**
 * True when motion should be cut: the OS asks for it, or the user chose
 * "Reduced" in Settings. Use this, not motion's `useReducedMotion`, which only
 * knows the OS. False on the server and during hydration.
 */
export function useReducedMotionPref(): boolean {
  return useSyncExternalStore(subscribeMotion, motionReduced, () => false);
}
