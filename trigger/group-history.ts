import type { ModelMessage, UIMessage } from "ai";
import type { Handoff } from "./handoff";
import type { ChatMessageMetadata } from "./sandbox-tools";

/** The bot each user message was sent to, in order; undefined where none was recorded. */
export function recipients(uiMessages: UIMessage[]): (string | undefined)[] {
  return uiMessages
    .filter((m) => m.role === "user")
    .map((m) => (m.metadata as ChatMessageMetadata | undefined)?.botId);
}

function textOf(message: ModelMessage): string {
  if (typeof message.content === "string") return message.content;
  return message.content
    .flatMap((part) => (part.type === "text" ? [part.text] : []))
    .join("\n")
    .trim();
}

/** A successful handoff in a tool message: the bot that speaks next. */
function handoffIn(message: ModelMessage): Handoff | undefined {
  if (message.role !== "tool") return undefined;
  for (const part of message.content) {
    if (part.type === "tool-result" && part.toolName === "handoff" && part.output.type === "json") {
      return part.output.value as Handoff;
    }
  }
}

/**
 * Rewrites a group chat's history for the bot answering now. A reply belongs
 * to the bot its user message was sent to, until that bot hands off; then the
 * replies after it are the target's. Left as `assistant`, every other bot's
 * reply reads as this bot's own words and it takes on their persona. So
 * other bots' replies become attributed user-side quotes (their tool calls
 * and results dropped: another computer, not this bot's), and user messages
 * meant for another bot say who they were for.
 *
 * Model and UI messages pair up by user message: conversion emits exactly
 * one model user message per UI user message.
 */
export function attributeGroupHistory(
  messages: ModelMessage[],
  sentTo: (string | undefined)[],
  me: string,
  names: Map<string, string>,
): ModelMessage[] {
  let turn = -1;
  let speaker: string | undefined;
  let next: string | undefined;
  const out: ModelMessage[] = [];
  const nameOf = (id: string) => names.get(id) ?? "another bot";
  // One quote per speaker per turn, however many steps they took.
  let quote: { from: string; text: string[] } | undefined;
  const flush = () => {
    if (quote?.text.length) {
      const header = `(${quote.from} replied; these are not your words.)`;
      out.push({ role: "user", content: [header, ...quote.text].join("\n\n") });
    }
    quote = undefined;
  };

  for (const message of messages) {
    if (message.role === "user") {
      flush();
      turn++;
      speaker = sentTo[turn];
      next = undefined;
    } else if (message.role === "assistant" && next) {
      flush();
      speaker = next;
      next = undefined;
    }
    const handoff = handoffIn(message);
    if (handoff) next = handoff.botId;

    const other = message.role !== "system" && speaker && speaker !== me ? nameOf(speaker) : undefined;
    if (!other) {
      out.push(message);
      continue;
    }

    if (message.role === "user") {
      const note = { type: "text" as const, text: `(To ${other}, not you.)` };
      out.push({
        ...message,
        content: typeof message.content === "string" ? `${note.text}\n${message.content}` : [note, ...message.content],
      });
    } else if (message.role === "assistant") {
      quote ??= { from: other, text: [] };
      const text = textOf(message);
      if (text) quote.text.push(text);
    } else if (handoff) {
      quote ??= { from: other, text: [] };
      const to = handoff.botId === me ? "you" : handoff.name;
      quote.text.push(`(${other} handed this message to ${to}: ${handoff.reason})`);
    }
    // Other tool results from another bot's turn are dropped with its tool calls.
  }
  flush();
  return out;
}
