import { ArrowLeft, Bot } from "lucide-react";
import Link from "next/link";
import type * as React from "react";
import { AvatarStage } from "@/components/avatar-stage";
import { gazeSvg } from "@/components/chat-avatar";
import { MissingPath } from "@/components/missing-path";
import { Chip } from "@/components/ui/bento";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Fixed seed: the root not-found ships with every page, so it stays free of request-time reads.
const LOST_SVG = gazeSvg("ellum-lost");

const stagger = (i: number) => ({ "--i": i }) as React.CSSProperties;

/** 404 state: "4 0 4" where the 0 is a gaze avatar that follows the cursor, looking for the page. */
export function NotFoundState({ className }: { className?: string }) {
  const digit = "font-display tabular text-[88px] leading-none tracking-[-0.04em] text-ink select-none sm:text-[128px]";

  return (
    <div className={cn("flex flex-1 flex-col items-center justify-center px-6 py-14 text-center", className)}>
      <p className="readout entrance" style={stagger(0)}>
        Route not found
      </p>

      <div aria-hidden className="entrance mt-5 flex items-center gap-1 sm:gap-3" style={stagger(1)}>
        <span className={digit}>4</span>
        <AvatarStage svg={LOST_SVG} className="size-24 sm:size-32" />
        <span className={digit}>4</span>
      </div>
      <h1 className="sr-only">404</h1>

      <h2
        className="entrance mt-7 font-display text-xl leading-tight tracking-[-0.01em] text-ink"
        style={stagger(2)}
      >
        This page wandered off
      </h2>
      <p className="entrance mt-2 max-w-sm text-[13px] leading-relaxed text-ink-2" style={stagger(3)}>
        Nothing lives at{" "}
        <Chip className="mx-0.5 h-6 max-w-[16rem] px-2.5 align-middle text-ink">
          <span className="truncate">
            <MissingPath />
          </span>
        </Chip>
        . It may have moved, or the link is mistyped.
      </p>

      <div className="entrance mt-7 flex flex-wrap items-center justify-center gap-2" style={stagger(4)}>
        <Button size="pill" nativeButton={false} render={<Link href="/" />}>
          <ArrowLeft data-icon="inline-start" />
          Back home
        </Button>
        <Button size="pill" variant="surface" nativeButton={false} render={<Link href="/bots" />}>
          <Bot data-icon="inline-start" />
          Your bots
        </Button>
      </div>
    </div>
  );
}
