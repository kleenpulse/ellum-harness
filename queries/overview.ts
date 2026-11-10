import "server-only";
import { auth } from "@clerk/nextjs/server";
import { and, eq, gte, sql } from "drizzle-orm";
import { cache } from "react";
import type { Tone } from "@/components/ui/status-pill";
import { USAGE_PATH } from "@/lib/billing";
import { listSandboxStates, type SandboxState } from "@/lib/daytona";
import { db } from "@/lib/db";
import { bots, turns } from "@/lib/db/schema";
import { LIMIT_MESSAGES, PRO_LIMITS, type Metric } from "@/lib/usage-limits";
import { getBots } from "./bots";
import { getMyAllowance } from "./usage";

export type SandboxStatus = {
  tone: Tone;
  label: string;
  /** Running right now. */
  live: boolean;
  /** Won't work until someone steps in. */
  fault?: "fault" | "missing";
};

const AWAKE: SandboxStatus = { tone: "ok", label: "Awake", live: true };
const ASLEEP: SandboxStatus = { tone: "paused", label: "Asleep", live: false };
const STARTING: SandboxStatus = { tone: "running", label: "Starting", live: false };
const BUSY: SandboxStatus = { tone: "running", label: "Busy", live: false };
const FAULT: SandboxStatus = { tone: "attention", label: "Fault", live: false, fault: "fault" };
const MISSING: SandboxStatus = { tone: "attention", label: "Missing", live: false, fault: "missing" };
const UNKNOWN: SandboxStatus = { tone: "idle", label: "Unknown", live: false };
const NONE: SandboxStatus = { tone: "idle", label: "No sandbox", live: false };

const BY_STATE: Partial<Record<SandboxState, SandboxStatus>> = {
  started: AWAKE,
  // Asleep sandboxes wake on the bot's next turn.
  stopped: ASLEEP,
  stopping: ASLEEP,
  paused: ASLEEP,
  pausing: ASLEEP,
  archived: ASLEEP,
  archiving: ASLEEP,
  creating: STARTING,
  starting: STARTING,
  restoring: STARTING,
  resuming: STARTING,
  pending_build: STARTING,
  building_snapshot: STARTING,
  pulling_snapshot: STARTING,
  resizing: BUSY,
  snapshotting: BUSY,
  forking: BUSY,
  error: FAULT,
  build_failed: FAULT,
  destroyed: MISSING,
  destroying: MISSING,
};

export type SandboxStatuses = {
  /** False when Daytona couldn't be reached; every sandbox then reads Unknown. */
  available: boolean;
  byBot: Record<string, SandboxStatus>;
};

/** Each of the user's bots' sandbox state, read live from Daytona without waking any. */
export const getSandboxStatuses = cache(async (): Promise<SandboxStatuses> => {
  const { userId } = await auth();
  if (!userId) return { available: true, byBot: {} };

  const rows = await db.select({ id: bots.id, sandboxId: bots.sandboxId }).from(bots).where(eq(bots.userId, userId));
  if (!rows.some((row) => row.sandboxId)) {
    return { available: true, byBot: Object.fromEntries(rows.map((row) => [row.id, NONE])) };
  }

  let states: Map<string, SandboxState> | undefined;
  try {
    states = await listSandboxStates(userId);
  } catch (error) {
    console.error("Couldn't read sandbox states", error);
  }

  const status = (sandboxId: string | null) => {
    if (!sandboxId) return NONE;
    if (!states) return UNKNOWN;
    const state = states.get(sandboxId);
    return state ? (BY_STATE[state] ?? UNKNOWN) : MISSING;
  };
  return {
    available: states !== undefined,
    byBot: Object.fromEntries(rows.map((row) => [row.id, status(row.sandboxId)])),
  };
});

export type BotActivity = { runs: number; lastRunAt: Date };

export type RunStats = {
  /** Runs per 24 hours, oldest first; the last entry is the 24 hours up to now. */
  days: number[];
  thisWeek: number;
  lastWeek: number;
  /** Change on the 7 days before; null when there is nothing to compare with. */
  pct: number | null;
  /** Bots that ran in the last 7 days. */
  byBot: Record<string, BotActivity>;
};

const WEEK = 7;
const DAY_MS = 86_400_000;

/** The user's runs over the last 14 days, in 24-hour steps back from now, so no time zone is involved. */
export const getRunStats = cache(async (): Promise<RunStats> => {
  const stats: RunStats = { days: Array<number>(WEEK).fill(0), thisWeek: 0, lastWeek: 0, pct: null, byBot: {} };
  const { userId } = await auth();
  if (!userId) return stats;

  const daysAgo = sql<number>`floor(extract(epoch from (now() - ${turns.createdAt})) / 86400)::int`;
  const rows = await db
    .select({
      botId: turns.botId,
      daysAgo,
      runs: sql<number>`count(*)::int`,
      lastRunAt: sql<string>`max(${turns.createdAt})`,
    })
    .from(turns)
    .where(and(eq(turns.userId, userId), gte(turns.createdAt, new Date(Date.now() - 2 * WEEK * DAY_MS))))
    .groupBy(turns.botId, daysAgo);

  for (const row of rows) {
    if (row.daysAgo < 0 || row.daysAgo >= 2 * WEEK) continue;
    if (row.daysAgo >= WEEK) {
      stats.lastWeek += row.runs;
      continue;
    }
    stats.thisWeek += row.runs;
    stats.days[WEEK - 1 - row.daysAgo] += row.runs;
    const lastRunAt = new Date(row.lastRunAt);
    const bot = stats.byBot[row.botId];
    stats.byBot[row.botId] = {
      runs: (bot?.runs ?? 0) + row.runs,
      lastRunAt: bot && bot.lastRunAt > lastRunAt ? bot.lastRunAt : lastRunAt,
    };
  }
  if (stats.lastWeek > 0) stats.pct = Math.round(((stats.thisWeek - stats.lastWeek) / stats.lastWeek) * 100);
  return stats;
});

export type AttentionItem = { id: string; tone: "critical" | "warn"; text: string; href: string };

/** Same mark as the usage meters. */
const WARN_AT = 0.8;

const LIMIT_LABELS: Record<Metric, string> = {
  ai_tokens: "AI allowance",
  sandbox_seconds: "sandbox time",
  sandboxes_created: "new bots",
};

/** What won't work, or soon won't, until the user does something. */
export const getAttention = cache(async (): Promise<AttentionItem[]> => {
  const [botList, statuses, allowance] = await Promise.all([getBots(), getSandboxStatuses(), getMyAllowance()]);
  const items: AttentionItem[] = [];

  for (const bot of botList) {
    const href = bot.chatId ? `/c/${bot.chatId}` : "/bots";
    const fault = statuses.byBot[bot.id]?.fault;
    if (!bot.hasSandbox) {
      items.push({ id: `none-${bot.id}`, tone: "warn", text: `${bot.name} has no sandbox, so it can't use a computer.`, href });
    } else if (fault === "missing") {
      items.push({ id: `missing-${bot.id}`, tone: "critical", text: `${bot.name}'s sandbox is gone. Delete the bot and make it again.`, href });
    } else if (fault === "fault") {
      items.push({ id: `fault-${bot.id}`, tone: "critical", text: `${bot.name}'s sandbox has a fault and may not start.`, href });
    }
  }

  if (allowance?.pro) {
    for (const metric of Object.keys(PRO_LIMITS) as Metric[]) {
      const share = allowance.used[metric] / PRO_LIMITS[metric];
      if (share >= 1) {
        items.push({ id: metric, tone: "critical", text: LIMIT_MESSAGES[metric], href: USAGE_PATH });
      } else if (share >= WARN_AT) {
        items.push({
          id: metric,
          tone: "warn",
          text: `${Math.floor(share * 100)}% of this period's ${LIMIT_LABELS[metric]} is used.`,
          href: USAGE_PATH,
        });
      }
    }
  } else if (allowance && botList.length) {
    items.push({ id: "plan", tone: "warn", text: "Your bots need the Pro plan to chat and use their sandboxes.", href: "#pricing" });
  }

  return items.sort((a, b) => Number(b.tone === "critical") - Number(a.tone === "critical"));
});
