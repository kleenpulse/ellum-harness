"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "@bprogress/next/app";
import { useCallback, useMemo } from "react";
import { requestPricingOpen } from "@/components/billing/pricing-dialog";
import { toast } from "@/components/ui/toast";
import { hasFeatures, UPGRADE_MESSAGE, USAGE_PATH, type Feature } from "@/lib/billing";

/**
 * Client-side plan checks, for feedback before a round trip. The server
 * actions check again; this is never the guard.
 */
export function usePlanGate() {
  const { has, isLoaded } = useAuth();
  const router = useRouter();

  /** The upgrade toast; its action opens the #pricing dialog. */
  const prompt = useCallback(
    (description = UPGRADE_MESSAGE) => {
      const id = toast.add({
        title: "Upgrade to Pro",
        description,
        type: "error",
        actionProps: {
          children: "See plans",
          onClick: () => {
            toast.close(id);
            requestPricingOpen();
          },
        },
      });
    },
    [],
  );

  /** A usage limit is reached; its action opens the usage page. */
  const limit = useCallback(
    (description: string) => {
      const id = toast.add({
        title: "Limit reached",
        description,
        type: "error",
        actionProps: {
          children: "See usage",
          onClick: () => {
            toast.close(id);
            router.push(USAGE_PATH);
          },
        },
      });
    },
    [router],
  );

  /** True if the plan has every feature; otherwise shows the upgrade toast. */
  const allows = useCallback(
    (features: readonly Feature[]) => {
      // Session not loaded yet: let it through, the server decides.
      if (!isLoaded || !has || hasFeatures(has, features)) return true;
      prompt();
      return false;
    },
    [has, isLoaded, prompt],
  );

  // Stable, so callers can list it in effect and callback deps.
  return useMemo(() => ({ allows, prompt, limit }), [allows, prompt, limit]);
}
