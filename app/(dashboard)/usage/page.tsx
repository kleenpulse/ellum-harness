import { format } from "date-fns";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Bento, BentoTitle, StatStrip, StatTile } from "@/components/ui/bento";
import { PageFrame } from "@/components/shell/page-frame";
import { ResetCountdown } from "@/components/usage/reset-countdown";
import { UsageMeter } from "@/components/usage/usage-meter";
import { MAX_BOTS, PRO_LIMITS } from "@/lib/usage-limits";
import { getMyAllowance } from "@/queries/usage";

export const metadata: Metadata = { title: "Usage" };

const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });
const tokens = (n: number) => compact.format(n);
const hours = (seconds: number) => {
  if (seconds > 0 && seconds < 3600) return `${Math.max(1, Math.round(seconds / 60))} min`;
  const h = seconds / 3600;
  return `${h < 10 ? h.toFixed(1).replace(/\.0$/, "") : Math.round(h)} h`;
};
const whole = (n: number) => String(n);

// Reached from the account menu, not the rail.
export default async function UsagePage() {
  const allowance = await getMyAllowance();

  if (!allowance?.pro) {
    return (
      <PageFrame title="Usage" subtitle="Free plan">
        <Bento className="flex max-w-3xl flex-col items-start gap-3">
          <BentoTitle>Nothing to track yet</BentoTitle>
          <p className="text-[13px] text-ink-2">
            Bots, chatting with them and their sandboxes are on the Pro plan. Once you subscribe,
            this page shows how much of each period&apos;s allowance you&apos;ve used.
          </p>
          <Button size="pill" nativeButton={false} render={<a href="#pricing" />}>
            See plans
          </Button>
        </Bento>
      </PageFrame>
    );
  }

  const { period, used, bots, asOf } = allowance;

  return (
    <PageFrame
      title="Usage"
      subtitle={`Pro plan · ${format(period.start, "MMM d")} to ${format(period.end, "MMM d")}`}
      actions={
        <Button size="pill" variant="surface" nativeButton={false} render={<a href="#pricing" />}>
          Manage plan
        </Button>
      }
      intro={
        <StatStrip>
          <StatTile label="Plan" value="Pro" dot="signal" i={0} />
          <StatTile
            label="Resets in"
            value={<ResetCountdown end={period.end.toISOString()} now={asOf.getTime()} />}
            sub={format(period.end, "EEE, MMM d 'at' h:mm a")}
            i={1}
          />
          <StatTile
            label="Bots"
            value={`${bots} / ${MAX_BOTS}`}
            sub={bots >= MAX_BOTS ? "Delete one to make another" : `${MAX_BOTS - bots} more allowed`}
            dot={bots >= MAX_BOTS ? "critical" : undefined}
            i={2}
          />
          <StatTile label="Period started" value={format(period.start, "MMM d")} i={3} />
        </StatStrip>
      }
    >
      <Bento className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <BentoTitle>This period</BentoTitle>
          <p className="text-[13px] text-ink-2">
            Everything below starts again from zero when the period resets.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-8 @3xl:grid-cols-3">
          <UsageMeter
            label="AI tokens"
            used={used.ai_tokens}
            limit={PRO_LIMITS.ai_tokens}
            format={tokens}
            note="What your bots read and write, screenshots included."
          />
          <UsageMeter
            label="Sandbox time"
            used={used.sandbox_seconds}
            limit={PRO_LIMITS.sandbox_seconds}
            format={hours}
            note="While a bot works on its computer, or you have its desktop open."
          />
          <UsageMeter
            label="New bots"
            used={used.sandboxes_created}
            limit={PRO_LIMITS.sandboxes_created}
            format={whole}
            note="Each new bot gets a fresh computer. Deleting one doesn't give it back."
          />
        </div>
      </Bento>
    </PageFrame>
  );
}
