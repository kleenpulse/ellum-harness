import { Plus } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { BotDialog } from "@/components/bot-dialog";
import { BotList } from "@/components/bots/bot-list";
import { BotsEmpty } from "@/components/bots/bots-empty";
import {
  AttentionCard,
  AttentionFallback,
  AttentionTile,
  SandboxesTile,
  TileFallback,
} from "@/components/overview/attention";
import { RecentChats } from "@/components/overview/recent-chats";
import { RunsCard } from "@/components/overview/runs-card";
import { Bento, BentoTitle, Chip, StatStrip, StatTile } from "@/components/ui/bento";
import { Button } from "@/components/ui/button";
import { PageFrame } from "@/components/shell/page-frame";
import { MAX_BOTS } from "@/lib/usage-limits";
import { getBots } from "@/queries/bots";
import { getChats } from "@/queries/chats";
import { getRunStats } from "@/queries/overview";

export default async function OverviewPage() {
  const [bots, chats, stats] = await Promise.all([getBots(), getChats(), getRunStats()]);

  return (
    <PageFrame
      title="Overview"
      subtitle="Your bots, their sandboxes and the last 7 days of runs"
      actions={
        <BotDialog size="pill">
          <Plus data-icon="inline-start" />
          New bot
        </BotDialog>
      }
      intro={
        <StatStrip>
          <StatTile
            i={0}
            label="Bots"
            value={bots.length}
            sub={bots.length ? `Up to ${MAX_BOTS} on Pro` : "None created yet"}
          />
          {/* Sandbox state comes from Daytona, so these two stream in after the page. */}
          <Suspense fallback={<TileFallback i={1} label="Sandboxes awake" />}>
            <SandboxesTile i={1} />
          </Suspense>
          <StatTile
            i={2}
            label="Runs this week"
            value={stats.thisWeek}
            sub={
              stats.thisWeek + stats.lastWeek === 0
                ? "Nothing has run yet"
                : `${stats.lastWeek} the week before`
            }
          />
          <Suspense fallback={<TileFallback i={3} label="Needs attention" />}>
            <AttentionTile i={3} />
          </Suspense>
        </StatStrip>
      }
    >
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 flex flex-col gap-4 @board:col-span-8">
          <Bento i={1} className="flex flex-col">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <BentoTitle>Bots</BentoTitle>
                {bots.length ? <Chip className="tabular h-6 px-2.5">{bots.length}</Chip> : null}
              </div>
              {bots.length ? (
                <Button size="pill-sm" variant="surface" nativeButton={false} render={<Link href="/bots" />}>
                  View all
                </Button>
              ) : null}
            </div>
            {bots.length ? (
              <div className="mt-4">
                <BotList bots={bots} activity={stats.byBot} />
              </div>
            ) : (
              <BotsEmpty />
            )}
          </Bento>
          <RecentChats i={2} chats={chats} />
        </div>

        <div className="col-span-12 grid content-start gap-4 @3xl:grid-cols-2 @board:col-span-4 @board:grid-cols-1">
          <RunsCard i={3} stats={stats} />
          <Suspense fallback={<AttentionFallback i={4} />}>
            <AttentionCard i={4} />
          </Suspense>
        </div>
      </div>
    </PageFrame>
  );
}
