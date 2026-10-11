import "server-only";
import { auth } from "@clerk/nextjs/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { chats } from "@/lib/db/schema";

export type ChatListItem = {
  id: string;
  name: string;
  /** Every member's seed, oldest member first: one for a direct chat, several for a group. */
  avatars: string[];
  preview: string | null;
  lastMessageAt: Date;
};

/** The signed-in user's chats, newest activity first. */
export async function getChats(): Promise<ChatListItem[]> {
  const { userId } = await auth();
  if (!userId) return [];

  const rows = await db.query.chats.findMany({
    where: eq(chats.userId, userId),
    orderBy: desc(chats.lastMessageAt),
    columns: { id: true, name: true, lastMessagePreview: true, lastMessageAt: true },
    with: {
      members: {
        orderBy: (m, { asc }) => [asc(m.joinedAt), asc(m.botId)],
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
        avatars: members.map((m) => m.bot.avatar),
        preview: chat.lastMessagePreview,
        lastMessageAt: chat.lastMessageAt,
      },
    ];
  });
}

export type ChatBot = { id: string; name: string; avatar: string; job: string; instructions: string | null };

export type ChatDetail = {
  id: string;
  kind: "direct" | "group";
  name: string;
  /** Oldest member first; a direct chat has exactly one. */
  bots: ChatBot[];
};

/** One of the signed-in user's chats, or null if it doesn't exist or isn't theirs. */
export async function getChat(chatId: string): Promise<ChatDetail | null> {
  const { userId } = await auth.protect();

  const chat = await db.query.chats.findFirst({
    // Scoped by owner: another user's chat id reads as missing, not forbidden.
    where: and(eq(chats.id, chatId), eq(chats.userId, userId)),
    columns: { id: true, kind: true, name: true },
    with: {
      members: {
        orderBy: (m, { asc }) => [asc(m.joinedAt), asc(m.botId)],
        with: { bot: { columns: { id: true, name: true, avatar: true, job: true, instructions: true } } },
      },
    },
  });

  const bots = chat?.members.map((m) => m.bot) ?? [];
  if (!chat || !bots[0]) return null;

  return { id: chat.id, kind: chat.kind, name: chat.name ?? bots[0].name, bots };
}
