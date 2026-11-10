"use client";

import { UserAvatar, useClerk, useUser } from "@clerk/nextjs";
import { LogOut, UserRound } from "lucide-react";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";

const pulse = "animate-pulse rounded-pill bg-foreground/8";

/** Who is signed in, with the way into Clerk's profile and the way out. */
export function Account() {
  const { isLoaded, user } = useUser();
  const clerk = useClerk();
  const [leaving, startLeaving] = useTransition();

  if (!isLoaded || !user) {
    return (
      <div aria-hidden className="flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <span className="size-11 shrink-0 animate-pulse rounded-full bg-foreground/8" />
          <div className="flex flex-1 flex-col gap-2">
            <span className={`${pulse} h-3.5 w-28`} />
            <span className={`${pulse} h-3 w-40`} />
          </div>
        </div>
        <div className="flex gap-2">
          <span className={`${pulse} h-8 w-36`} />
          <span className={`${pulse} h-8 w-24`} />
        </div>
      </div>
    );
  }

  const email = user.primaryEmailAddress?.emailAddress;
  const name = user.fullName || user.username || email || "Your account";

  function signOut() {
    startLeaving(async () => {
      try {
        await clerk.signOut({ redirectUrl: "/" });
      } catch (error) {
        console.error("Sign out failed", error);
        toast.add({ type: "error", title: "Couldn't sign you out", description: "Check your connection and try again." });
      }
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <UserAvatar appearance={{ elements: { avatarBox: "size-11" } }} />
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-[14px] font-medium text-ink">{name}</span>
          {email && email !== name ? <span className="truncate text-[12.5px] text-ink-2">{email}</span> : null}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="pill-sm" variant="surface" disabled={leaving} onClick={() => clerk.openUserProfile()}>
          <UserRound data-icon="inline-start" />
          Manage account
        </Button>
        <Button size="pill-sm" variant="ghost" disabled={leaving} onClick={signOut}>
          {leaving ? <Spinner data-icon="inline-start" /> : <LogOut data-icon="inline-start" />}
          Sign out
        </Button>
      </div>
    </div>
  );
}
