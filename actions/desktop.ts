"use server";

import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { DESKTOP_FEATURES, hasFeatures, UPGRADE_MESSAGE } from "@/lib/billing";
import { ensureDesktop, getRunningSandbox } from "@/lib/daytona";
import { chats } from "@/lib/db/schema";
import { DESKTOP_BEAT_MS, getAllowance, LIMIT_MESSAGES, meterSandbox, remaining } from "@/lib/usage";

const NOVNC_PORT = 6080;
// One page visit's worth: the iframe loads once and keeps its websocket open past expiry.
const URL_TTL_SECONDS = 60 * 60;

type Failure = { ok: false; error: string; upgrade?: true; limit?: true };
export type DesktopResult = { ok: true; url: string } | Failure;
export type DesktopBeatResult = { ok: true } | Failure;

/** The direct chat's bot, owner-scoped. */
async function chatBot(chatId: string, userId: string) {
  const chat = await db.query.chats.findFirst({
    // Direct chats only: a group has no single desktop to show.
    where: and(eq(chats.id, chatId), eq(chats.userId, userId), eq(chats.kind, "direct")),
    columns: { id: true },
    with: {
      members: {
        limit: 1,
        with: { bot: { columns: { id: true, sandboxId: true } } },
      },
    },
  });
  return chat?.members[0]?.bot;
}

/** Plan and sandbox time; a failure to hand back, or null when there's time left. */
async function sandboxTimeCheck(userId: string): Promise<Failure | null> {
  const allowance = await getAllowance(userId);
  if (!allowance.pro) return { ok: false, error: UPGRADE_MESSAGE, upgrade: true };
  if (remaining(allowance.used, "sandbox_seconds") < 1) {
    return { ok: false, error: LIMIT_MESSAGES.sandbox_seconds, limit: true };
  }
  return null;
}

/** Wakes the chat's bot desktop and returns a signed noVNC URL for it. Takes ~10s when the desktop is cold. */
export async function openDesktop(chatId: string): Promise<DesktopResult> {
  const { userId, has } = await auth();
  if (!userId) return { ok: false, error: "Sign in to see the desktop." };
  if (!hasFeatures(has, DESKTOP_FEATURES)) return { ok: false, error: UPGRADE_MESSAGE, upgrade: true };

  const blocked = await sandboxTimeCheck(userId);
  if (blocked) return blocked;

  const bot = await chatBot(chatId, userId);
  if (!bot?.sandboxId) return { ok: false, error: "This bot has no computer yet." };

  try {
    const sandbox = await getRunningSandbox(bot.sandboxId);
    await ensureDesktop(sandbox);
    const { url } = await sandbox.getSignedPreviewUrl(NOVNC_PORT, URL_TTL_SECONDS);
    const params = new URLSearchParams({ autoconnect: "true", resize: "scale", reconnect: "true" });
    return { ok: true, url: `${url}/vnc.html?${params}` };
  } catch (error) {
    console.error("openDesktop", error);
    return { ok: false, error: "The desktop didn't start. Try again in a moment." };
  }
}

/**
 * Charges the last beat of an open desktop to the ledger. Not ok once the
 * plan or the sandbox time runs out; the panel then closes the desktop.
 */
export async function meterDesktop(chatId: string): Promise<DesktopBeatResult> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "Sign in to see the desktop." };

  const bot = await chatBot(chatId, userId);
  if (!bot) return { ok: false, error: "This bot has no computer yet." };

  const now = new Date();
  await meterSandbox(userId, bot.id, new Date(now.getTime() - DESKTOP_BEAT_MS), now, chatId);
  return (await sandboxTimeCheck(userId)) ?? { ok: true };
}
