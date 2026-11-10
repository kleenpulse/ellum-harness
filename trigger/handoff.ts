import { tool, type UIMessage } from "ai";
import { z } from "zod";

export type GroupMember = { id: string; name: string; job: string };
/** `botId`/`name`: the bot taking over; `from`: the name of the bot handing it on. */
export type Handoff = { botId: string; name: string; from: string; reason: string };

/**
 * Hands the user's message to another bot in a group chat. The turn stops on
 * the call (`hasToolCall("handoff")`); the client then asks for a turn as the
 * target bot, so it answers with its own prompt, tools and sandbox.
 */
export function createHandoffTool(members: GroupMember[], me: string, handedToMe: () => boolean) {
  const others = members.filter((m) => m.id !== me);
  const from = members.find((m) => m.id === me)?.name ?? "Another bot";
  return tool({
    description:
      "Pass the user's message to another bot in this group whose job fits it clearly better than yours. They answer it next, in your place. Don't answer the message yourself as well.",
    inputSchema: z.object({
      to: z.string().describe(`The bot's name: one of ${others.map((m) => m.name).join(", ")}.`),
      reason: z.string().describe("One short sentence for the user on why that bot fits better."),
    }),
    execute: async ({ to, reason }): Promise<Handoff> => {
      // One hop: a bot handed a message answers it, so two bots can't bounce it forever.
      if (handedToMe()) throw new Error("This message was handed to you. Answer it yourself.");
      const target = others.find((m) => m.name.trim().toLowerCase() === to.trim().toLowerCase());
      if (!target) throw new Error(`No bot called ${to} here. Pick one of: ${others.map((m) => m.name).join(", ")}.`);
      return { botId: target.id, name: target.name, from, reason };
    },
  });
}

export type HandoffTool = ReturnType<typeof createHandoffTool>;

/**
 * The handoff a message ends on, if any. Only the final part counts: the
 * client appends the target bot's answer to the same message.
 */
export function endsInHandoff(message: UIMessage | undefined): Handoff | undefined {
  if (message?.role !== "assistant") return undefined;
  const part = message.parts.findLast((p) => p.type !== "step-start");
  return part?.type === "tool-handoff" && "state" in part && part.state === "output-available"
    ? (part.output as Handoff)
    : undefined;
}
