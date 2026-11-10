import "server-only";
import { auth } from "@clerk/nextjs/server";
import { desc, eq } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/lib/db";
import { bots } from "@/lib/db/schema";

export type BotListItem = {
  id: string;
  name: string;
  avatar: string;
  job: string;
  hasSandbox: boolean;
  /** The bot's direct chat, made with it; null only if that chat is gone. */
  chatId: string | null;
};

/** The signed-in user's bots, newest first. One query per request: the rail and the page both ask. */
export const getBots = cache(async (): Promise<BotListItem[]> => {
  const { userId } = await auth();
  if (!userId) return [];

  const rows = await db.query.bots.findMany({
    where: eq(bots.userId, userId),
    orderBy: desc(bots.createdAt),
    columns: { id: true, name: true, avatar: true, job: true, sandboxId: true },
    with: { memberships: { columns: {}, with: { chat: { columns: { id: true, kind: true } } } } },
  });

  return rows.map(({ sandboxId, memberships, ...bot }) => ({
    ...bot,
    hasSandbox: sandboxId !== null,
    chatId: memberships.find((m) => m.chat.kind === "direct")?.chat.id ?? null,
  }));
});
