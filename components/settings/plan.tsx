import { format } from "date-fns";
import Link from "next/link";
import { Bento, BentoTitle } from "@/components/ui/bento";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { ResetCountdown } from "@/components/usage/reset-countdown";
import { UsageMeter } from "@/components/usage/usage-meter";
import { USAGE_PATH } from "@/lib/billing";
import { formatHours, formatTokens, formatWhole } from "@/lib/usage-format";
import { MAX_BOTS, PRO_LIMITS } from "@/lib/usage-limits";
import { getMyAllowance } from "@/queries/usage";

const pulse = "animate-pulse rounded-pill bg-foreground/8";

export function PlanFallback({ i }: { i?: number }) {
  return (
    <Bento i={i} className="flex flex-col gap-5">
      <BentoTitle>Plan and usage</BentoTitle>
      <div aria-hidden className="flex flex-col gap-3">
        <span className={`${pulse} h-3 w-3/5`} />
        <span className={`${pulse} h-3 w-4/5`} />
        <span className={`${pulse} h-8 w-28`} />
      </div>
    </Bento>
  );
}

/** The plan, and on Pro how much of this period's allowance is used. Details live on the Usage page. */
export async function Plan({ i }: { i?: number }) {
  const allowance = await getMyAllowance();

  if (!allowance?.pro) {
    return (
      <Bento i={i} className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <BentoTitle>Plan and usage</BentoTitle>
          <StatusPill tone="idle">Free</StatusPill>
        </div>
        <p className="text-[13px] leading-relaxed text-ink-2">
          Bots, chatting with them and their sandboxes are on the Pro plan.
        </p>
        <Button size="pill-sm" className="w-fit" nativeButton={false} render={<a href="#pricing" />}>
          See plans
        </Button>
      </Bento>
    );
  }

  const { period, used, bots, asOf } = allowance;

  return (
    <Bento i={i} className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <BentoTitle>Plan and usage</BentoTitle>
        <StatusPill tone="running" className="[&>svg]:hidden">
          Pro
        </StatusPill>
      </div>
      <dl className="well flex flex-col divide-y divide-border dark:divide-glass-border">
        <div className="flex items-baseline justify-between gap-3 px-4 py-3">
          <dt className="readout">Resets in</dt>
          <dd className="text-[13px] text-ink">
            <ResetCountdown end={period.end.toISOString()} now={asOf.getTime()} />
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-3 px-4 py-3">
          <dt className="readout">Period</dt>
          <dd className="tabular text-[13px] text-ink">
            {format(period.start, "MMM d")} to {format(period.end, "MMM d")}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-3 px-4 py-3">
          <dt className="readout">Bots</dt>
          <dd className="tabular text-[13px] text-ink">
            {bots} / {MAX_BOTS}
          </dd>
        </div>
      </dl>
      <div className="flex flex-col gap-6">
        <UsageMeter label="AI tokens" used={used.ai_tokens} limit={PRO_LIMITS.ai_tokens} format={formatTokens} />
        <UsageMeter
          label="Sandbox time"
          used={used.sandbox_seconds}
          limit={PRO_LIMITS.sandbox_seconds}
          format={formatHours}
        />
        <UsageMeter
          label="New bots"
          used={used.sandboxes_created}
          limit={PRO_LIMITS.sandboxes_created}
          format={formatWhole}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="pill-sm" variant="surface" nativeButton={false} render={<Link href={USAGE_PATH} />}>
          Usage details
        </Button>
        <Button size="pill-sm" variant="ghost" nativeButton={false} render={<a href="#pricing" />}>
          Manage plan
        </Button>
      </div>
    </Bento>
  );
}
