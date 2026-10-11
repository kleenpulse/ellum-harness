import { prompts } from "@trigger.dev/sdk";
import { chat } from "@trigger.dev/sdk/ai";
import type { Sandbox } from "@daytona/sdk";
import { isStepCount } from "ai";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getRunningSandbox } from "@/lib/daytona/client";
import { db } from "@/lib/db/client";
import { bots, chatMembers, chats } from "@/lib/db/schema";
import { chatModel } from "./model";
import { createSandboxTools, hoistScreenshots, type ChatUIMessage } from "./sandbox-tools";

export const botSystemPrompt = prompts.define({
  id: "bot-system",
  description: "Base identity for a user's bot: name, job, instructions and sandbox.",
  variables: z.object({
    name: z.string(),
    job: z.string(),
    instructions: z.string().optional(),
    sandbox: z.string().optional(),
  }),
  content: `You are {{name}}, a bot on Ellum. The person you're talking to created you and owns you.

## Your job

{{job}}

This is why you exist. Stay focused on it, and when a request falls outside it, say so plainly and help as far as it reasonably goes.
{{#instructions}}

## How your owner wants you to work

{{instructions}}
{{/instructions}}
{{#sandbox}}

## Your computer

You have your own sandbox: a dedicated, isolated Linux computer that belongs to you alone, separate from your owner's machine and from every other bot. It has a 1024x768 desktop (xfce), Chromium, Python and Node.js, and your home is /home/daytona. It stops itself when idle and comes back with its files intact when you next use it.

Your tools act on this computer: a shell, its files, its mouse and keyboard, and its screen.

- Prefer the shell and files for anything they can do. Reach for the mouse and keyboard only for what needs the GUI.
- Look before you click: call viewScreen and place the pointer from that screenshot. Mouse positions are on a 0–1000 grid over the screenshot (x left→right, y top→bottom), not pixels. After an action that changes the screen, look again to confirm it worked before moving on.
- Start GUI apps from the shell in the background, e.g. \`nohup chromium --no-sandbox https://example.com > /tmp/chromium.log 2>&1 &\`, then look at the screen.
- viewScreen is for you; the user doesn't see it. Use showScreen only when the user asks to see your screen or what's on it.
- When a step fails, read the error, adjust and try a different way rather than repeating the same call.
{{/sandbox}}

## How you talk

- Be direct and concise. Lead with the answer.
- Write like a capable colleague, not a customer-service script.
- Never claim to have done, checked or run something you haven't. If you don't know, say so.`,
});

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

// No `storage`: the platform's default transcript storage keeps each conversation, keyed by chatId.
export const chatAgent = chat.withUIMessage<ChatUIMessage>().agent({
  id: "chat",
  // Groups pick the bot that answers each turn; sent as per-message metadata.
  clientDataSchema: z.object({ botId: z.string().optional() }),
  // Per turn so the sandbox is the chat's bot's. On the config, not only on
  // streamText, so screenshots' toModelOutput survives into later turns.
  tools: ({ chatId, clientData }) => {
    let pending: Promise<Sandbox> | undefined;
    return createSandboxTools(() => {
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
  },
  // Every turn, not onChatStart: that skips continuation runs, and a bot
  // edited mid-chat should answer as its new self on the next message.
  onTurnStart: async ({ chatId, clientData }) => {
    const bot = await botForChat(chatId, clientData?.botId);
    const resolved = await botSystemPrompt.resolve({
      name: bot.name,
      job: bot.job,
      instructions: bot.instructions ?? undefined,
      sandbox: bot.sandboxId ?? undefined,
    });
    chat.prompt.set(resolved);
  },
  run: async ({ messages, tools, signal, streamText }) =>
    streamText({
      model: chatModel,
      messages,
      tools,
      stopWhen: isStepCount(40),
      prepareStep: ({ messages }) => ({ messages: hoistScreenshots(messages) }),
      abortSignal: signal,
    }),
});
