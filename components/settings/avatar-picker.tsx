"use client";

import { useUser } from "@clerk/nextjs";
import { Check, Shuffle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { cn } from "@/lib/utils";

// Mirrors AVATAR_SEED_KEY in lib/avatar.ts (server-only, so not importable here).
const KEY = "avatarSeed";

export function AvatarPicker({
  preferred,
  options,
}: {
  preferred: string | null;
  options: { seed: string; svg: string }[];
}) {
  const { user } = useUser();
  const router = useRouter();
  const [chosen, setChosen] = useState(preferred);
  const [pending, startTransition] = useTransition();

  function save(seed: string | null) {
    if (!user) return;
    setChosen(seed);
    startTransition(async () => {
      // update() replaces unsafeMetadata wholesale: carry the other keys over.
      const metadata = { ...user.unsafeMetadata };
      if (seed) metadata[KEY] = seed;
      else delete metadata[KEY];
      await user.update({ unsafeMetadata: metadata });
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-4 gap-3 @xl:grid-cols-6">
        {options.map(({ seed, svg }) => {
          const active = seed === chosen;
          return (
            <button
              key={seed}
              type="button"
              aria-pressed={active}
              aria-label={active ? "Preferred avatar" : "Use this avatar"}
              disabled={pending || !user}
              onClick={() => save(seed)}
              className={cn(
                "relative grid aspect-square place-items-center rounded-well bg-card-nested ring-1 ring-border transition-[box-shadow,background-color,transform] duration-200 ease-swell outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97] disabled:opacity-60 dark:ring-glass-border",
                active && "bg-signal-soft ring-2 ring-signal dark:ring-signal",
              )}
            >
              <span aria-hidden className="size-3/5 [&_svg]:size-full" dangerouslySetInnerHTML={{ __html: svg }} />
              {active && (
                <span className="absolute top-2 right-2 grid size-5 place-items-center rounded-full bg-signal text-primary-foreground">
                  <Check className="size-3" strokeWidth={3} />
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {chosen ? (
          <StatusPill tone="ok">Preferred avatar set</StatusPill>
        ) : (
          <StatusPill tone="idle">New face every visit</StatusPill>
        )}
        <div className="ml-auto flex items-center gap-2">
          <Button
            size="pill-sm"
            variant="ghost"
            disabled={pending}
            onClick={() => startTransition(() => router.refresh())}
          >
            <Shuffle data-icon="inline-start" />
            Shuffle
          </Button>
          {chosen ? (
            <Button size="pill-sm" variant="surface" disabled={pending || !user} onClick={() => save(null)}>
              Use a new face every visit
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
