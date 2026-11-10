import { chat } from "@trigger.dev/sdk/ai";
import type { Sandbox } from "@daytona/sdk";
import { hasToolCall, isStepCount } from "ai";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getRunningSandbox } from "@/lib/daytona/client";
import { db } from "@/lib/db/client";
import { bots, chatMembers, chats } from "@/lib/db/schema";
import { chatModel } from "./model";
import { attributeGroupHistory, recipients } from "./group-history";
import { createHandoffTool, endsInHandoff, type GroupMember } from "./handoff";
import { botSystemPrompt, roster } from "./prompt";
import { createSandboxTools, hoistScreenshots, type ChatUIMessage } from "./sandbox-tools";

/**
 * The bot answering this turn, owner-scoped through the chat row. A direct
 * chat has one; a group names it per turn, and that id is only trusted if
 * the bot is a member of the chat.
 */
async function botForChat(chatId: string, botId?: string) {
  const [row] = await db
    .select({
      name: bots.name,
      job: bots.job,
      instructions: bots.instructions,
      sandboxId: bots.sandboxId,
    })
    .from(chats)
    .innerJoin(chatMembers, eq(chatMembers.chatId, chats.id))
    .innerJoin(bots, and(eq(bots.id, chatMembers.botId), eq(bots.userId, chats.userId)))
    .where(
      and(
        eq(chats.id, chatId),
        botId ? eq(chatMembers.botId, botId) : eq(chats.kind, "direct"),
      ),
    )
    .limit(1);
  if (!row) throw new Error(`No bot ${botId ?? ""} for chat ${chatId}`);
  return row;
}

/** A group's bots, in the order they joined. */
function groupMembers(chatId: string): Promise<GroupMember[]> {
  return db
    .select({ id: bots.id, name: bots.name, job: bots.job })
    .from(chatMembers)
    .innerJoin(bots, eq(bots.id, chatMembers.botId))
    .where(eq(chatMembers.chatId, chatId))
    .orderBy(chatMembers.joinedAt);
}

// No `storage`: the platform's default transcript storage keeps each conversation, keyed by chatId.
export const chatAgent = chat.withUIMessage<ChatUIMessage>().agent({
  id: "chat",
  // Groups pick the bot that answers each turn; sent as per-message metadata.
  clientDataSchema: z.object({ botId: z.string().optional() }),
  // A handoff runs a turn as the target bot (clientData.botId) on the history
  // as it stands, without a new user message.
  actionSchema: z.object({ type: z.literal("handoff") }),
  onAction: async ({ uiMessages, clientData }) => {
    const handoff = endsInHandoff(uiMessages.at(-1));
    if (!handoff || handoff.botId !== clientData?.botId) return;
    return chat.turn();
  },
  // Per turn so the sandbox is the chat's bot's. On the config, not only on
  // streamText, so screenshots' toModelOutput survives into later turns.
  tools: async ({ chatId, clientData }) => {
    const botId = clientData?.botId;
    let pending: Promise<Sandbox> | undefined;
    const sandboxTools = createSandboxTools(() => {
      pending ??= botForChat(chatId, clientData?.botId)
        .then(({ sandboxId }) => {
          if (!sandboxId) throw new Error("This bot has no sandbox.");
          return getRunningSandbox(sandboxId);
        })
        .catch((error) => {
          // A transient failure shouldn't poison every later tool call this turn.
          pending = undefined;
          throw error;
        });
      return pending;
    });
    if (!botId) return sandboxTools;
    const handedToMe = () => endsInHandoff(chat.history.all().at(-1))?.botId === botId;
    return { ...sandboxTools, handoff: createHandoffTool(await groupMembers(chatId), botId, handedToMe) };
  },
  // Every turn, not onChatStart: that skips continuation runs, and a bot
  // edited mid-chat should answer as its new self on the next message.
  onTurnStart: async ({ chatId, clientData, uiMessages }) => {
    const botId = clientData?.botId;
    const [bot, members] = await Promise.all([botForChat(chatId, botId), botId ? groupMembers(chatId) : undefined]);
    const handoff = endsInHandoff(uiMessages.at(-1));
    const resolved = await botSystemPrompt.resolve({
      name: bot.name,
      job: bot.job,
      instructions: bot.instructions ?? undefined,
      sandbox: bot.sandboxId ?? undefined,
      group: botId && members ? roster(members, botId) || undefined : undefined,
      handedBy: handoff && handoff.botId === botId ? handoff.from : undefined,
    });
    chat.prompt.set(resolved);
  },
  // Groups: every bot's replies sit in one history; attribute them so the
  // answering bot doesn't read another bot's words as its own.
  prepareMessages: async ({ messages, chatId, clientData }) => {
    const botId = clientData?.botId;
    if (!botId) return messages;
    const names = new Map((await groupMembers(chatId)).map((m) => [m.id, m.name]));
    return attributeGroupHistory(messages, recipients(chat.history.all()), botId, names);
  },
  run: async ({ messages, tools, signal, streamText }) =>
    streamText({
      model: chatModel,
      messages,
      tools,
      // A handoff ends the turn; the target bot answers in the next one.
      stopWhen: [isStepCount(40), hasToolCall("handoff")],
      prepareStep: ({ messages }) => ({ messages: hoistScreenshots(messages) }),
      abortSignal: signal,
    }),
});
