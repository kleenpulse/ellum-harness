import { chat } from "@trigger.dev/sdk/ai";
import type { Sandbox } from "@daytona/sdk";
import { hasToolCall, isStepCount } from "ai";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getRunningSandbox, readMemory } from "@/lib/daytona/client";
import { db } from "@/lib/db/client";
import { bots, chatMembers, chats } from "@/lib/db/schema";
import { chatModel } from "./model";
import { attributeGroupHistory, recipients } from "./group-history";
import { createHandoffTool, endsInHandoff, type GroupMember } from "./handoff";
import { botSystemPrompt, roster } from "./prompt";
import { createSandboxTools, type ChatUIMessage } from "./sandbox-tools";

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

// Every turn pays for the memory in tokens; past this it's clipped, and the bot is told.
const MEMORY_PROMPT_MAX = 8_000;
function clipMemory(text: string) {
  if (text.length <= MEMORY_PROMPT_MAX) return text;
  return `${text.slice(0, MEMORY_PROMPT_MAX)}\n…[clipped: the file is longer; read it with readFile, and tidy it up next time you save]`;
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
  // Optional: direct chats send no metadata, and the SDK parses it every turn.
  clientDataSchema: z.object({ botId: z.string().optional() }).optional(),
  // Each action runs a turn as clientData.botId without a new user message:
  // - handoff: on the history as it stands, after another bot passed it on.
  // - regenerate: drops everything after a user message and answers it again.
  // - edit: replaces a user message's text, drops what followed, answers it.
  actionSchema: z.discriminatedUnion("type", [
    z.object({ type: z.literal("handoff") }),
    z.object({ type: z.literal("regenerate"), messageId: z.string() }),
    z.object({ type: z.literal("edit"), messageId: z.string(), text: z.string().trim().min(1) }),
  ]),
  onAction: async ({ action, uiMessages, clientData }) => {
    if (action.type === "handoff") {
      const handoff = endsInHandoff(uiMessages.at(-1));
      if (!handoff || handoff.botId !== clientData?.botId) return;
      return chat.turn();
    }
    const target = chat.history.all().find((m) => m.id === action.messageId);
    if (target?.role !== "user") return;
    chat.history.rollbackTo(target.id);
    if (action.type === "edit") {
      chat.history.replace(target.id, { ...target, parts: [{ type: "text", text: action.text }] });
    }
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
    // In the prompt, not left to a readFile call: the model skipped that read
    // in group chats and answered as if it had never been told.
    const memory = bot.sandboxId ? await readMemory(bot.sandboxId) : undefined;
    const handoff = endsInHandoff(uiMessages.at(-1));
    const resolved = await botSystemPrompt.resolve({
      name: bot.name,
      job: bot.job,
      instructions: bot.instructions ?? undefined,
      sandbox: bot.sandboxId ?? undefined,
      memory:
        memory === undefined
          ? "(Couldn't load it this turn. Read it with readFile if you need it, and before you save.)"
          : clipMemory(memory.trim()) || "(Empty so far.)",
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
  run: async ({ messages, tools, signal, streamText, ctx }) => {
    // Runs stay pinned to the worker build they started on, and every save in
    // dev is a new build. Exiting after each turn makes the next message start
    // a run on the current code instead of resuming a stale one.
    if (ctx.environment.type === "DEVELOPMENT") chat.endRun();
    return streamText({
      model: chatModel,
      messages,
      tools,
      // A handoff ends the turn; the target bot answers in the next one.
      stopWhen: [isStepCount(40), hasToolCall("handoff")],
      // No prepareStep returning messages: see chatModel in ./model.
      abortSignal: signal,
    });
  },
});
