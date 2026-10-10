"use server";

import { auth } from "@clerk/nextjs/server";
import { refresh } from "next/cache";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { db } from "@/lib/db";
import { bots, chatMembers, chats } from "@/lib/db/schema";
import { botSchema, type BotInput } from "@/lib/db/validation";

type BotFailure = {
  ok: false;
  error: string;
  fieldErrors?: Partial<Record<keyof BotInput, string[]>>;
};

export type CreateBotResult = { ok: true; id: string; name: string; chatId: string } | BotFailure;
export type UpdateBotResult = { ok: true; id: string; name: string } | BotFailure;

export async function createBot(input: BotInput): Promise<CreateBotResult> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "Sign in to create a bot." };

  const parsed = botSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Check the highlighted fields.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const { instructions, ...rest } = parsed.data;
  // Ids are minted here so the member row can point at both parents within
  // one batch; neon-http runs a batch as a single transaction.
  const botId = nanoid();
  const chatId = nanoid();
  const [[bot]] = await db.batch([
    db
      .insert(bots)
      // userId comes from the session, never from the client.
      .values({ ...rest, id: botId, instructions: instructions || null, userId })
      .returning({ id: bots.id, name: bots.name }),
    db.insert(chats).values({ id: chatId, userId, kind: "direct" }),
    db.insert(chatMembers).values({ chatId, botId }),
  ]);

  refresh();
  return { ok: true, ...bot, chatId };
}

export async function updateBot(botId: string, input: BotInput): Promise<UpdateBotResult> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "Sign in to edit a bot." };

  const parsed = botSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Check the highlighted fields.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const { instructions, ...rest } = parsed.data;
  const [bot] = await db
    .update(bots)
    .set({ ...rest, instructions: instructions || null })
    // Scoped by owner: someone else's bot id matches no row.
    .where(and(eq(bots.id, botId), eq(bots.userId, userId)))
    .returning({ id: bots.id, name: bots.name });
  if (!bot) return { ok: false, error: "That bot no longer exists." };

  refresh();
  return { ok: true, ...bot };
}
