"use server";

import { auth } from "@clerk/nextjs/server";
import { auth as triggerAuth } from "@trigger.dev/sdk";
import { chat, defaultStorage, type ChatStartSessionParams } from "@trigger.dev/sdk/ai";
import { and, eq, inArray, notInArray } from "drizzle-orm";
import { refresh } from "next/cache";
import { nanoid } from "nanoid";
import { z } from "zod";
import { db } from "@/lib/db";
import { bots, chatMembers, chats } from "@/lib/db/schema";
import { groupChatSchema, type GroupChatInput } from "@/lib/db/validation";
import type { LoadTranscriptResult } from "@trigger.dev/sdk/chat/react";
import type { chatAgent } from "@/trigger/chat";
import type { ChatUIMessage } from "@/trigger/sandbox-tools";

// chatId comes from the browser: signed in isn't enough, the chat must be theirs.
async function assertOwnChat(chatId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const chat = await db.query.chats.findFirst({
    where: and(eq(chats.id, chatId), eq(chats.userId, userId)),
    columns: { id: true },
  });
  if (!chat) throw new Error("Chat not found");
}

const start = chat.createStartSessionAction<typeof chatAgent>("chat");
const load = chat.createLoadTranscriptAction(defaultStorage);

/** Creates the chat's session and first run, returns a session-scoped token. Idempotent per chatId. */
export async function startChatSession(params: ChatStartSessionParams<typeof chatAgent>) {
  await assertOwnChat(params.chatId);
  return start(params);
}

/** Refreshes the session token; the transport calls this on 401/403. */
export async function mintChatAccessToken(chatId: string) {
  await assertOwnChat(chatId);
  return triggerAuth.createPublicToken({
    scopes: { read: { sessions: chatId }, write: { sessions: chatId } },
    expirationTime: "1h",
  });
}

/** The chat's saved history, for rendering before the stream connects. */
export async function loadChatTranscript(params: {
  chatId: string;
  limit?: number;
}): Promise<LoadTranscriptResult<ChatUIMessage>> {
  await assertOwnChat(params.chatId);
  // The SDK's loader isn't generic; this chat's agent only ever writes ChatUIMessages.
  return (await load(params)) as LoadTranscriptResult<ChatUIMessage>;
}

export type CreateGroupChatResult =
  | { ok: true; id: string; name: string }
  | { ok: false; error: string; fieldErrors?: Partial<Record<keyof GroupChatInput, string[]>> };

export async function createGroupChat(input: GroupChatInput): Promise<CreateGroupChatResult> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "Sign in to create a group chat." };

  const parsed = groupChatSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Check the highlighted fields.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const botIds = [...new Set(parsed.data.botIds)];
  // Bot ids come from the browser: every one must be the user's own.
  const owned = await db
    .select({ id: bots.id })
    .from(bots)
    .where(and(inArray(bots.id, botIds), eq(bots.userId, userId)));
  if (owned.length !== botIds.length) {
    return { ok: false, error: "Some of those bots no longer exist.", fieldErrors: { botIds: ["Pick from your bots."] } };
  }

  const id = nanoid();
  await db.batch([
    db.insert(chats).values({ id, userId, kind: "group", name: parsed.data.name }),
    db.insert(chatMembers).values(botIds.map((botId) => ({ chatId: id, botId }))),
  ]);

  refresh();
  return { ok: true, id, name: parsed.data.name };
}

export type UpdateGroupChatResult = CreateGroupChatResult;
export type DeleteGroupChatResult = { ok: true } | { ok: false; error: string };

/** Renames a group and sets its members: new bots join, unticked ones leave, the rest keep their place. */
export async function updateGroupChat(chatId: string, input: GroupChatInput): Promise<UpdateGroupChatResult> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "Sign in to edit a group chat." };

  const parsed = groupChatSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Check the highlighted fields.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  // Checked before the batch: its member deletes aren't scoped by owner.
  const chat = await db.query.chats.findFirst({
    where: and(eq(chats.id, chatId), eq(chats.userId, userId), eq(chats.kind, "group")),
    columns: { id: true },
  });
  if (!chat) return { ok: false, error: "That group no longer exists." };

  const botIds = [...new Set(parsed.data.botIds)];
  const owned = await db
    .select({ id: bots.id })
    .from(bots)
    .where(and(inArray(bots.id, botIds), eq(bots.userId, userId)));
  if (owned.length !== botIds.length) {
    return { ok: false, error: "Some of those bots no longer exist.", fieldErrors: { botIds: ["Pick from your bots."] } };
  }

  await db.batch([
    db.update(chats).set({ name: parsed.data.name }).where(eq(chats.id, chatId)),
    db.delete(chatMembers).where(and(eq(chatMembers.chatId, chatId), notInArray(chatMembers.botId, botIds))),
    db
      .insert(chatMembers)
      .values(botIds.map((botId) => ({ chatId, botId })))
      .onConflictDoNothing(),
  ]);

  refresh();
  return { ok: true, id: chatId, name: parsed.data.name };
}

/** Deletes a group and its members. The bots and their direct chats stay. */
export async function deleteGroupChat(chatId: string): Promise<DeleteGroupChatResult> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "Sign in to delete a group chat." };

  const [chat] = await db
    .delete(chats)
    .where(and(eq(chats.id, chatId), eq(chats.userId, userId), eq(chats.kind, "group")))
    .returning({ id: chats.id });
  if (!chat) return { ok: false, error: "That group no longer exists." };

  // No refresh() here: this page's chat is gone, so a refresh would render
  // its 404. The client navigates away, then refreshes.
  return { ok: true };
}
