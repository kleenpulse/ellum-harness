import "server-only";
import { auth } from "@clerk/nextjs/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { bots } from "@/lib/db/schema";

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
