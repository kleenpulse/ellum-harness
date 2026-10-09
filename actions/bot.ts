"use server";

import { auth } from "@clerk/nextjs/server";
import { refresh } from "next/cache";
import { nanoid } from "nanoid";
import { z } from "zod";
import { db } from "@/lib/db";
import { bots, chatMembers, chats } from "@/lib/db/schema";
import { createBotSchema, type CreateBotInput } from "@/lib/db/validation";

export type CreateBotResult =
  | { ok: true; id: string; name: string; chatId: string }
  | {
      ok: false;
      error: string;
      fieldErrors?: Partial<Record<keyof CreateBotInput, string[]>>;
    };

export async function createBot(input: CreateBotInput): Promise<CreateBotResult> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "Sign in to create a bot." };

  const parsed = createBotSchema.safeParse(input);
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
