import { Plus } from "lucide-react";
import { BotDialog } from "@/components/bot-dialog";
import { BotList } from "@/components/bots/bot-list";
import { BotsEmpty } from "@/components/bots/bots-empty";
import {
  Bento,
  BentoTitle,
  Caption,
  Chip,
  DeltaChip,
  StatStrip,
  StatTile,
  Well,
} from "@/components/ui/bento";
import { StatusPill } from "@/components/ui/status-pill";
import { PageFrame } from "@/components/shell/page-frame";
import { getBots } from "@/queries/bots";

// Placeholder figures until sandboxes are wired up.
const SANDBOXES = [
  { name: "Inbox triage", tone: "running", label: "Running" },
  { name: "Release notes", tone: "ok", label: "Ready" },
  { name: "Lead research", tone: "paused", label: "Paused" },
  { name: "Weekly digest", tone: "attention", label: "Needs you" },
] as const;

export default async function OverviewPage() {
  const bots = await getBots();
  const live = bots.filter((b) => b.hasSandbox).length;

  return (
    <PageFrame
      title="Overview"
      subtitle="Your bots and their sandboxes · last 7 days"
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
            sub={bots.length ? `${bots.length} created` : "None created yet"}
          />
          <StatTile
            i={1}
            label="Sandboxes live"
            value={live}
            dot="signal"
            sub="Started on first use"
          />
          <StatTile
            i={2}
            label="Runs this week"
            value="—"
            sub="Nothing has run"
          />
          <StatTile
            i={3}
            label="Needs attention"
            value="0"
            dot="mute"
            sub="All quiet"
          />
        </StatStrip>
      }
    >
      <div className="grid grid-cols-12 gap-4">
        <Bento i={1} className="col-span-12 flex flex-col @board:col-span-8">
          <div className="flex items-center justify-between gap-3">
            <BentoTitle>Bots</BentoTitle>
            <Chip>all time</Chip>
          </div>
          {bots.length ? (
            <div className="mt-4">
              <BotList bots={bots} />
            </div>
          ) : (
            <BotsEmpty />
          )}
        </Bento>

        <div className="col-span-12 grid gap-4 @3xl:grid-cols-2 @board:col-span-4 @board:grid-cols-1">
          <Bento i={2} className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <BentoTitle>Sandbox health</BentoTitle>
              <Caption>preview</Caption>
            </div>
            <Well className="flex flex-col divide-y divide-border p-0 dark:divide-glass-border">
              {SANDBOXES.map((s) => (
                <div
                  key={s.name}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <span className="truncate text-[13.5px] text-ink">
                    {s.name}
                  </span>
                  <StatusPill tone={s.tone}>{s.label}</StatusPill>
                </div>
              ))}
            </Well>
          </Bento>

          <Bento i={3} className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <span className="readout">Runs this week</span>
              <DeltaChip pct={12} />
            </div>
            <span className="tabular font-display text-kpi text-ink">148</span>
            <Caption>preview data</Caption>
          </Bento>
        </div>
      </div>
    </PageFrame>
  );
}
