"use server";

import { auth } from "@clerk/nextjs/server";
import { auth as triggerAuth } from "@trigger.dev/sdk";
import { chat, defaultStorage, type ChatStartSessionParams } from "@trigger.dev/sdk/ai";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { chats } from "@/lib/db/schema";
import type { chatAgent } from "@/trigger/chat";

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
export async function loadChatTranscript(params: { chatId: string; limit?: number }) {
  await assertOwnChat(params.chatId);
  return load(params);
}
