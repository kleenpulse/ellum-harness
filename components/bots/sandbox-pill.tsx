import { Suspense } from "react";
import { StatusPill } from "@/components/ui/status-pill";
import { getSandboxStatuses } from "@/queries/overview";

async function LiveSandboxPill({ botId }: { botId: string }) {
  const { byBot } = await getSandboxStatuses();
  const status = byBot[botId];
  if (!status) return null;
  return <StatusPill tone={status.tone}>{status.label}</StatusPill>;
}

/** The bot's sandbox state, read live. Streams in, so a slow Daytona never holds the list back. */
export function SandboxPill({ botId }: { botId: string }) {
  return (
    <Suspense
      fallback={<span aria-hidden className="h-6 w-16 shrink-0 animate-pulse rounded-pill bg-foreground/8" />}
    >
      <LiveSandboxPill botId={botId} />
    </Suspense>
  );
}
