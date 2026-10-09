"use server";

import { auth } from "@clerk/nextjs/server";
import { refresh } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { bots } from "@/lib/db/schema";
import { createBotSchema, type CreateBotInput } from "@/lib/db/validation";

export type CreateBotResult =
  | { ok: true; id: string; name: string }
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
  const [bot] = await db
    .insert(bots)
    // userId comes from the session, never from the client.
    .values({ ...rest, instructions: instructions || null, userId })
    .returning({ id: bots.id, name: bots.name });

  refresh();
  return { ok: true, ...bot };
}
