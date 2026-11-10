import { createClerkClient } from "@clerk/backend";
import { addMonths } from "date-fns";
import { and, count, eq, gte, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/lib/db/client";
import { bots, usageEvents } from "@/lib/db/schema";
import { PRO_LIMITS, PRO_PLAN, type Metric } from "./usage-limits";

// Shared by the app and the Trigger agent, so no "server-only" here: Trigger
// tasks run outside Next. Both need CLERK_SECRET_KEY.

export * from "./usage-limits";

export type Period = { start: Date; end: Date };

let clerk: ReturnType<typeof createClerkClient> | undefined;
const clerkClient = () => (clerk ??= createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY }));

/**
 * The user's current Pro period, or null when they aren't on Pro. Limits
 * reset monthly from the subscription's start, also on a yearly plan.
 */
export async function getProPeriod(userId: string, now = new Date()): Promise<Period | null> {
  let items;
  try {
    ({ subscriptionItems: items } = await clerkClient().billing.getUserBillingSubscription(userId));
  } catch (error) {
    // A user who never opened billing has no subscription at all.
    if ((error as { status?: number }).status === 404) return null;
    throw error;
  }
  const item = items.find((i) => i.plan?.slug === PRO_PLAN && i.status === "active");
  if (!item) return null;

  const anchor = new Date(item.periodStart);
  let months = 0;
  while (addMonths(anchor, months + 1) <= now) months++;
  return { start: addMonths(anchor, months), end: addMonths(anchor, months + 1) };
}

export type Usage = Record<Metric, number>;

/** Totals from the ledger since `since`. */
export async function usageSince(userId: string, since: Date): Promise<Usage> {
  const rows = await db
    .select({ metric: usageEvents.metric, total: sql<string>`coalesce(sum(${usageEvents.amount}), 0)` })
    .from(usageEvents)
    .where(and(eq(usageEvents.userId, userId), gte(usageEvents.createdAt, since)))
    .groupBy(usageEvents.metric);
  const usage: Usage = { ai_tokens: 0, sandbox_seconds: 0, sandboxes_created: 0 };
  for (const row of rows) usage[row.metric] = Number(row.total);
  return usage;
}

export type Allowance =
  | { pro: false }
  /** `asOf`: the clock reading the period was picked with. */
  | { pro: true; period: Period; used: Usage; bots: number; asOf: Date };

/** Plan, period and what's been used of it. */
export async function getAllowance(userId: string): Promise<Allowance> {
  const asOf = new Date();
  const period = await getProPeriod(userId, asOf);
  if (!period) return { pro: false };
  const [used, [{ bots: botCount }]] = await Promise.all([
    usageSince(userId, period.start),
    db.select({ bots: count() }).from(bots).where(eq(bots.userId, userId)),
  ]);
  return { pro: true, period, used, bots: botCount, asOf };
}

/** How much of `metric` is left, never below zero. */
export const remaining = (used: Usage, metric: Metric) => Math.max(0, PRO_LIMITS[metric] - used[metric]);

type Refs = { botId?: string; chatId?: string };

/** Appends one row to the ledger. */
export async function recordUsage(userId: string, metric: Metric, amount: number, refs: Refs = {}) {
  const value = Math.round(amount);
  if (!Number.isFinite(value) || value <= 0) return;
  await db.insert(usageEvents).values({ userId, metric, amount: value, ...refs });
}

/**
 * Charges the bot's sandbox for the span `from`–`to`, minus whatever part of
 * it was charged already. Safe to call repeatedly with a growing `to`: a turn
 * calls it after every step, the desktop every minute. Returns the seconds
 * charged.
 */
export async function meterSandbox(userId: string, botId: string, from: Date, to: Date, chatId?: string): Promise<number> {
  // One statement, so the read of the old mark and its move see one snapshot.
  const { rows } = await db.execute<{ amount: number }>(sql`
    with prev as (
      select greatest(${from.toISOString()}::timestamptz, coalesce(sandbox_metered_until, ${from.toISOString()}::timestamptz)) as since
      from bots where id = ${botId} and user_id = ${userId}
    ),
    moved as (
      update bots set sandbox_metered_until = greatest(coalesce(sandbox_metered_until, ${to.toISOString()}::timestamptz), ${to.toISOString()}::timestamptz)
      where id = ${botId} and user_id = ${userId}
    ),
    span as (
      select round(extract(epoch from (${to.toISOString()}::timestamptz - since)))::int as seconds from prev
    )
    insert into usage_events (id, user_id, metric, amount, bot_id, chat_id)
    select ${nanoid()}, ${userId}, 'sandbox_seconds', seconds, ${botId}, ${chatId ?? null} from span where seconds > 0
    returning amount
  `);
  return rows[0]?.amount ?? 0;
}
