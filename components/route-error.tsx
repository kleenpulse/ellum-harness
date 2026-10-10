"use client";

import { RotateCw } from "lucide-react";
import { useOffline } from "next/offline";
import { useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { PaneState } from "@/components/ui/pane-state";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

/** Fault state shared by the `error.tsx` boundaries; `retry` re-fetches the segment. */
export function RouteError({
  error,
  retry,
  className,
}: {
  error: Error & { digest?: string };
  retry: () => void;
  className?: string;
}) {
  const isOffline = useOffline();
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    // the server's message is redacted in production; the cause chain lives in server logs
    console.error(error);
  }, [error]);

  return (
    <PaneState
      tone="critical"
      className={cn("min-h-svh", className)}
      title={isOffline ? "You're offline" : "Couldn't load this page"}
      action={
        <Button size="pill-sm" variant="surface" disabled={pending} onClick={() => startTransition(retry)}>
          {pending ? <Spinner data-icon="inline-start" /> : <RotateCw data-icon="inline-start" />}
          Try again
        </Button>
      }
    >
      {isOffline
        ? "Reconnect and try again. Nothing you've saved is lost."
        : "The connection to the server dropped. Usually a retry fixes it."}
    </PaneState>
  );
}
