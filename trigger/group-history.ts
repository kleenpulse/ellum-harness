import type { ModelMessage, UIMessage } from "ai";
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

/**
 * Rewrites a group chat's history for the bot answering now. A reply belongs
 * to the bot its user message was sent to; left as `assistant`, every other
 * bot's reply reads as this bot's own words and it takes on their persona.
 * So other bots' replies become attributed user-side quotes (their tool
 * calls and results dropped: another computer, not this bot's), and user
 * messages meant for another bot say who they were for.
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
  const out: ModelMessage[] = [];
  // One quote per turn, however many steps the other bot took.
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
    }
    const to = sentTo[turn];
    const other = message.role !== "system" && to && to !== me ? (names.get(to) ?? "another bot") : undefined;
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
    }
    // Tool results from another bot's turn are dropped with its tool calls.
  }
  flush();
  return out;
}
