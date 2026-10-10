import "server-only";
import { auth } from "@clerk/nextjs/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { chats } from "@/lib/db/schema";

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

export type ChatDetail = {
  id: string;
  kind: "direct" | "group";
  name: string;
  bot: { id: string; name: string; avatar: string; job: string; instructions: string | null };
};

/** One of the signed-in user's chats, or null if it doesn't exist or isn't theirs. */
export async function getChat(chatId: string): Promise<ChatDetail | null> {
  const { userId } = await auth.protect();

  const chat = await db.query.chats.findFirst({
    // Scoped by owner: another user's chat id reads as missing, not forbidden.
    where: and(eq(chats.id, chatId), eq(chats.userId, userId)),
    columns: { id: true, kind: true, name: true },
    with: {
      // Groups use their first bot for now.
      members: {
        orderBy: (m, { asc }) => asc(m.joinedAt),
        limit: 1,
        with: { bot: { columns: { id: true, name: true, avatar: true, job: true, instructions: true } } },
      },
    },
  });

  const bot = chat?.members[0]?.bot;
  if (!chat || !bot) return null;

  return { id: chat.id, kind: chat.kind, name: chat.name ?? bot.name, bot };
}
