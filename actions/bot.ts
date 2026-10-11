"use server";

import { auth } from "@clerk/nextjs/server";
import { refresh } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { createBotSandbox, deleteSandbox } from "@/lib/daytona";
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
export type DeleteBotResult = { ok: true } | { ok: false; error: string };

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

  let sandboxId: string;
  try {
    sandboxId = await createBotSandbox(botId, userId);
  } catch (error) {
    console.error("Sandbox creation failed", error);
    return { ok: false, error: "Couldn't set up the bot's sandbox. Try again." };
  }

  let bot: { id: string; name: string };
  try {
    [[bot]] = await db.batch([
      db
        .insert(bots)
        // userId comes from the session, never from the client.
        .values({ ...rest, id: botId, instructions: instructions || null, userId, sandboxId })
        .returning({ id: bots.id, name: bots.name }),
      db.insert(chats).values({ id: chatId, userId, kind: "direct" }),
      db.insert(chatMembers).values({ chatId, botId }),
    ]);
  } catch (error) {
    // No row points at the sandbox, so nothing else would ever delete it.
    await deleteSandbox(sandboxId).catch((cleanup) => console.error("Sandbox cleanup failed", cleanup));
    throw error;
  }

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

export async function deleteBot(botId: string): Promise<DeleteBotResult> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "Sign in to delete a bot." };

  const directChats = db
    .select({ id: chatMembers.chatId })
    .from(chatMembers)
    .where(eq(chatMembers.botId, botId));
  // Direct chats go first, while the membership rows that find them still
  // exist; group chats keep going without the bot.
  const [, [bot]] = await db.batch([
    db
      .delete(chats)
      .where(and(inArray(chats.id, directChats), eq(chats.kind, "direct"), eq(chats.userId, userId))),
    db
      .delete(bots)
      .where(and(eq(bots.id, botId), eq(bots.userId, userId)))
      .returning({ sandboxId: bots.sandboxId }),
  ]);
  if (!bot) return { ok: false, error: "That bot no longer exists." };

  // After the row is gone: a failure here strands a labelled sandbox rather
  // than leaving a bot pointing at a dead one.
  if (bot.sandboxId) {
    await deleteSandbox(bot.sandboxId).catch((error) => console.error("Sandbox deletion failed", error));
  }

  refresh();
  return { ok: true };
}
