"use client";

import { RotateCw } from "lucide-react";
import { useOffline } from "next/offline";
import { useUser } from "@clerk/nextjs";
import { useEffect, useMemo, useTransition } from "react";
import { AvatarStage } from "@/components/avatar-stage";
import { gazeSvg } from "@/components/chat-avatar";
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
  const { user } = useUser();
  // Mirrors AVATAR_SEED_KEY in lib/avatar.ts (server-only). Deterministic fallback: a random one would mismatch on hydration.
  const preferred = user?.unsafeMetadata?.avatarSeed;
  const seed = typeof preferred === "string" && preferred ? preferred : (error.digest ?? "ellum");
  const svg = useMemo(() => gazeSvg(seed), [seed]);

  useEffect(() => {
    // the server's message is redacted in production; the cause chain lives in server logs
    console.error(error);
  }, [error]);

  return (
    <PaneState
      tone="critical"
      media={<AvatarStage svg={svg} />}
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
