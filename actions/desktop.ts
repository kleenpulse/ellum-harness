"use server";

import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { ensureDesktop, getRunningSandbox } from "@/lib/daytona";
import { chats } from "@/lib/db/schema";

const NOVNC_PORT = 6080;
// One page visit's worth: the iframe loads once and keeps its websocket open past expiry.
const URL_TTL_SECONDS = 60 * 60;

export type DesktopResult = { ok: true; url: string } | { ok: false; error: string };

/** Wakes the chat's bot desktop and returns a signed noVNC URL for it. Takes ~10s when the desktop is cold. */
export async function openDesktop(chatId: string): Promise<DesktopResult> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "Sign in to see the desktop." };

  const chat = await db.query.chats.findFirst({
    // Direct chats only: a group has no single desktop to show.
    where: and(eq(chats.id, chatId), eq(chats.userId, userId), eq(chats.kind, "direct")),
    columns: { id: true },
    with: {
      members: {
        limit: 1,
        with: { bot: { columns: { sandboxId: true } } },
      },
    },
  });
  const sandboxId = chat?.members[0]?.bot.sandboxId;
  if (!sandboxId) return { ok: false, error: "This bot has no computer yet." };

  try {
    const sandbox = await getRunningSandbox(sandboxId);
    await ensureDesktop(sandbox);
    const { url } = await sandbox.getSignedPreviewUrl(NOVNC_PORT, URL_TTL_SECONDS);
    const params = new URLSearchParams({ autoconnect: "true", resize: "scale", reconnect: "true" });
    return { ok: true, url: `${url}/vnc.html?${params}` };
  } catch (error) {
    console.error("openDesktop", error);
    return { ok: false, error: "The desktop didn't start. Try again in a moment." };
  }
}
