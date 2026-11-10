import { Plus } from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";
import { BotDialog } from "@/components/bot-dialog";
import { BotCards } from "@/components/bots/bot-cards";
import { BotList } from "@/components/bots/bot-list";
import { BotsEmpty } from "@/components/bots/bots-empty";
import { BotsPager } from "@/components/bots/bots-pager";
import { BotsToolbar } from "@/components/bots/bots-toolbar";
import { PageFrame } from "@/components/shell/page-frame";
import { Bento } from "@/components/ui/bento";
import { Button } from "@/components/ui/button";
import { PaneState } from "@/components/ui/pane-state";
import { BOTS_VIEW_COOKIE, PAGE_SIZE, parseView } from "@/lib/bots/view";
import { getBots } from "@/queries/bots";
import { getRunStats } from "@/queries/overview";

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";

export default async function BotsPage({ searchParams }: PageProps<"/bots">) {
  const [params, jar, bots, stats] = await Promise.all([searchParams, cookies(), getBots(), getRunStats()]);

  const query = first(params.q).trim();
  const view = parseView(jar.get(BOTS_VIEW_COOKIE)?.value);

  // At most MAX_BOTS rows, already loaded for the rail: filter and slice here.
  const needle = query.toLowerCase();
  const matches = needle
    ? bots.filter((bot) => bot.name.toLowerCase().includes(needle) || bot.job.toLowerCase().includes(needle))
    : bots;
  const pages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
  const page = Math.min(Math.max(1, Math.floor(Number(first(params.page))) || 1), pages);
  const shown = matches.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <PageFrame
      title="Bots"
      subtitle="Each bot gets its own sandbox the first time it runs"
      actions={
        <BotDialog size="pill">
          <Plus data-icon="inline-start" />
          New bot
        </BotDialog>
      }
    >
      {bots.length ? (
        <>
          <BotsToolbar query={query} view={view} matches={matches.length} total={bots.length} />
          {shown.length === 0 ? (
            <Bento>
              <PaneState
                title={<>No bots match &ldquo;{query}&rdquo;</>}
                action={
                  <Button size="pill-sm" variant="surface" nativeButton={false} render={<Link href="/bots" />}>
                    Clear search
                  </Button>
                }
              >
                Search looks at each bot&apos;s name and job.
              </PaneState>
            </Bento>
          ) : view === "cards" ? (
            <BotCards bots={shown} activity={stats.byBot} />
          ) : (
            <BotList bots={shown} activity={stats.byBot} />
          )}
          <BotsPager query={query} page={page} matches={matches.length} />
        </>
      ) : (
        <Bento>
          <BotsEmpty cta={false} />
        </Bento>
      )}
    </PageFrame>
  );
}
