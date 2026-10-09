import "server-only";
import { auth } from "@clerk/nextjs/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { bots, chats } from "@/lib/db/schema";

export type ChatListItem = {
  id: string;
  name: string;
  avatar: string;
  preview: string | null;
  lastMessageAt: Date;
};

/** The signed-in user's chats, newest activity first, each fronted by one bot. */
export async function getChats(): Promise<ChatListItem[]> {
  const { userId } = await auth();
  if (!userId) return [];

  const rows = await db.query.chats.findMany({
    where: eq(chats.userId, userId),
    orderBy: desc(chats.lastMessageAt),
    columns: { id: true, name: true, lastMessagePreview: true, lastMessageAt: true },
    with: {
      // Group chats fall back to their first bot until they get a face of their own.
      members: {
        orderBy: (m, { asc }) => asc(m.joinedAt),
        limit: 1,
        with: { bot: { columns: { name: true, avatar: true } } },
      },
    },
  });

  return rows.flatMap(({ members, ...chat }) => {
    const bot = members[0]?.bot;
    if (!bot) return [];
    return [
      {
        id: chat.id,
        name: chat.name ?? bot.name,
        avatar: bot.avatar,
        preview: chat.lastMessagePreview,
        lastMessageAt: chat.lastMessageAt,
      },
    ];
  });
}

export type BotListItem = {
  id: string;
  name: string;
  avatar: string;
  job: string;
  hasSandbox: boolean;
};

/** The signed-in user's bots, newest first. */
export async function getBots(): Promise<BotListItem[]> {
  const { userId } = await auth();
  if (!userId) return [];

  const rows = await db.query.bots.findMany({
    where: eq(bots.userId, userId),
    orderBy: desc(bots.createdAt),
    columns: { id: true, name: true, avatar: true, job: true, sandboxId: true },
  });

  return rows.map(({ sandboxId, ...bot }) => ({ ...bot, hasSandbox: sandboxId !== null }));
}
