"use client";

import { PricingTable, useAuth } from "@clerk/nextjs";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BOT_FEATURES, hasFeatures } from "@/lib/billing";
import { createHashDialog } from "@/lib/hash-dialog";
import { cn } from "@/lib/utils";

// The plans, open while the URL hash is #pricing. There is no pricing page:
// the upgrade toast opens this, and so does any `#pricing` link.
const pricing = createHashDialog("#pricing");

export const PRICING_HASH = pricing.hash;
export const requestPricingOpen = pricing.open;

/** Opaque gradient panel, same as the changelog and the GrowDialog forms. */
const PANEL = "dialog-surface shadow-lift rounded-[24px] p-5 ring-border dark:ring-glass-border";

// Clerk opens checkout, plan details and subscription details as a drawer of
// its own, with no event to say so: watch the DOM for it.
const CLERK_DRAWER = ".cl-drawerRoot";
const clerkDrawerOpen = () => document.querySelector(CLERK_DRAWER) !== null;
const never = () => () => {};
function watchClerkDrawer(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.body, { childList: true, subtree: true });
  return () => observer.disconnect();
}

/** Mounted once in the (dashboard) layout. */
export function PricingDialog() {
  const open = pricing.useOpen();
  const { has } = useAuth();
  const pro = has ? hasFeatures(has, BOT_FEATURES) : false;

  // Checkout just went through: the plans have done their job. Only on the
  // change, so a Pro user can still open #pricing to switch or cancel.
  // One modal at a time: once Clerk's drawer is up the plans have handed over,
  // so they close and #pricing leaves the URL (closing the drawer lands on the
  // page, not back on the plans). Watched only while the plans are open, so a
  // busy page (a streaming chat) costs nothing.
  const drawer = useSyncExternalStore(open ? watchClerkDrawer : never, clerkDrawerOpen, () => false);
  useEffect(() => {
    if (open && drawer) pricing.close();
  }, [open, drawer]);

  const wasPro = useRef(pro);
  useEffect(() => {
    if (open && pro && !wasPro.current) pricing.close();
    wasPro.current = pro;
  }, [open, pro]);

  return (
    <Dialog open={open && !drawer} onOpenChange={(next) => !next && pricing.close()}>
      <DialogContent className={cn(PANEL, "max-h-[85svh] grid-rows-[auto_minmax(0,1fr)] sm:max-w-3xl")}>
        <DialogHeader>
          <DialogTitle>Upgrade to Pro</DialogTitle>
          <DialogDescription>Pro unlocks bots, chatting with them, and their sandboxes.</DialogDescription>
        </DialogHeader>
        <div className="-mx-5 min-h-0 overflow-y-auto overscroll-contain px-5 pb-1">
          {/* Plans and checkout live in Clerk (dashboard → Billing → Plans). */}
          <PricingTable />
        </div>
      </DialogContent>
    </Dialog>
  );
}
