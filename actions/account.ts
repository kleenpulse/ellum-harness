"use server";

import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { deleteUserSandboxes } from "@/lib/daytona";
import { db } from "@/lib/db";
import { bots, chats, turns } from "@/lib/db/schema";
import { deleteAllSchema, type DeleteAllInput } from "@/lib/db/validation";

export type DeleteAllResult =
  /** `strandedSandboxes`: computers Daytona could not remove (-1: they could not even be listed). */
  | { ok: true; bots: number; chats: number; strandedSandboxes: number }
  | { ok: false; error: string; fieldErrors?: Partial<Record<keyof DeleteAllInput, string[]>> };

/**
 * Deletes every bot, chat and sandbox the user has, and their run history.
 * The usage ledger stays: deleting must not refund a period's allowance. The
 * plan and the Clerk account are untouched.
 */
export async function deleteAllData(input: DeleteAllInput): Promise<DeleteAllResult> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "Sign in to delete your data." };

  const parsed = deleteAllSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Check the confirmation and try again.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  // Chats first: their member rows cascade, then the bots go.
  const [goneChats, goneBots] = await db.batch([
    db.delete(chats).where(eq(chats.userId, userId)).returning({ id: chats.id }),
    db.delete(bots).where(eq(bots.userId, userId)).returning({ id: bots.id }),
    db.delete(turns).where(eq(turns.userId, userId)),
  ]);

  // After the rows are gone: a failure here strands a labelled sandbox rather
  // than leaving a bot pointing at a dead one. Listed by label, not from the
  // rows, so sandboxes an earlier failed deletion left behind go too.
  let strandedSandboxes = 0;
  try {
    strandedSandboxes = await deleteUserSandboxes(userId);
  } catch (error) {
    console.error("Couldn't list sandboxes to delete", error);
    strandedSandboxes = -1;
  }

  refresh();
  return { ok: true, bots: goneBots.length, chats: goneChats.length, strandedSandboxes };
}
