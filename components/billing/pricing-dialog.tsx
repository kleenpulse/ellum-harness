"use client";

import { PricingTable, useAuth } from "@clerk/nextjs";
import { useEffect, useRef } from "react";
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

/** Mounted once in the (dashboard) layout. */
export function PricingDialog() {
  const open = pricing.useOpen();
  const { has } = useAuth();
  const pro = has ? hasFeatures(has, BOT_FEATURES) : false;

  // Checkout just went through: the plans have done their job. Only on the
  // change, so a Pro user can still open #pricing to switch or cancel.
  const wasPro = useRef(pro);
  useEffect(() => {
    if (open && pro && !wasPro.current) pricing.close();
    wasPro.current = pro;
  }, [open, pro]);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && pricing.close()}>
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
