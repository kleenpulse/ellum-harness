"use client";

import { useChat } from "@ai-sdk/react";
import type { TriggerChatTransport } from "@trigger.dev/sdk/chat";
import { useLoadTranscript, useTriggerChatTransport } from "@trigger.dev/sdk/chat/react";
import { useState } from "react";
import { loadChatTranscript, mintChatAccessToken, startChatSession } from "@/actions/chat";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { Reasoning, ReasoningContent, ReasoningTrigger } from "@/components/ai-elements/reasoning";
import { leadingMention, useBotMention } from "@/components/bot-mention";
import { CopyAction, EditAction, MessageActions, MessageEditor, RetryAction } from "@/components/message-actions";
import { ChatAvatar } from "@/components/chat-avatar";
import { ChatTool, isToolPart } from "@/components/chat-tool";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CircleAlertIcon } from "lucide-react";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSelect,
  PromptInputSelectContent,
  PromptInputSelectItem,
  PromptInputSelectTrigger,
  PromptInputSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import type { chatAgent } from "@/trigger/chat";
import { endsInHandoff } from "@/trigger/handoff";
import { cn } from "@/lib/utils";
import type { ChatUIMessage } from "@/trigger/sandbox-tools";

type ChatBot = { id: string; name: string; avatar: string; job: string };
type Part = ChatUIMessage["parts"][number];
type Segment = { author?: ChatBot; parts: { part: Part; i: number }[] };

/** A message's prose, for copying and editing. */
const textOf = (message: ChatUIMessage) =>
  message.parts.flatMap((p) => (p.type === "text" && p.text.trim() ? [p.text.trim()] : [])).join("\n\n");

/** Chat against the Trigger.dev chat agent. History comes from the agent's transcript storage. */
export function Chat({ chatId, bots }: { chatId: string; /** A group's members; picks who answers. */ bots?: ChatBot[] }) {
  const transport = useTriggerChatTransport<typeof chatAgent>({
    task: "chat",
    accessToken: ({ chatId }) => mintChatAccessToken(chatId),
    startSession: ({ chatId, clientData }) => startChatSession({ chatId, clientData }),
  });
  const { messages, isLoading, error } = useLoadTranscript(chatId, loadChatTranscript, { transport });

  if (error) throw error;
  if (isLoading) return null;

  // Keyed by chatId so useChat remounts with the loaded history instead of carrying messages across.
  return <ChatView key={chatId} chatId={chatId} initialMessages={messages} transport={transport} bots={bots} />;
}

function ChatView({
  chatId,
  initialMessages,
  transport,
  bots,
}: {
  chatId: string;
  initialMessages: ChatUIMessage[];
  transport: TriggerChatTransport;
  bots?: ChatBot[];
}) {
  const [botId, setBotId] = useState(bots?.[0]?.id);
  // Becomes the agent's clientData for this turn; direct chats send none.
  const turn = botId ? { metadata: { botId } } : undefined;
  const mention = useBotMention(bots, (bot) => setBotId(bot.id));

  const { messages, sendMessage, setMessages, status, stop, error, regenerate } = useChat<ChatUIMessage>({
    id: chatId,
    messages: initialMessages,
    transport,
    // Reconnects to an answer still streaming from before a reload.
    resume: initialMessages.length > 0,
    // A bot handed the message on: run the next turn as the target bot.
    onFinish: ({ message, isAbort, isError }) => {
      const handoff = !isAbort && !isError ? endsInHandoff(message) : undefined;
      if (!handoff) return;
      setBotId(handoff.botId);
      // After this request has fully settled; useChat still holds it during onFinish.
      setTimeout(() =>
        sendMessage(undefined, { body: { action: { type: "handoff" } }, metadata: { botId: handoff.botId } }),
      );
    },
  });

  const busy = status === "submitted" || status === "streaming";
  const [editingId, setEditingId] = useState<string>();
  const lastUser = messages.findLast((m) => m.role === "user");

  // Answers a user message again, as the bot it was sent to. Local history drops
  // what followed it; the agent does the same in onAction before its turn.
  const answerAgain = (message: ChatUIMessage, text?: string) => {
    if (text !== undefined) {
      setMessages((prev) => {
        const i = prev.findIndex((m) => m.id === message.id);
        return [...prev.slice(0, i), { ...message, parts: [{ type: "text", text }] }];
      });
    }
    const action = text === undefined
      ? { type: "regenerate" as const, messageId: message.id }
      : { type: "edit" as const, messageId: message.id, text };
    const to = message.metadata?.botId;
    void regenerate({ messageId: message.id, body: { action }, metadata: to ? { botId: to } : undefined });
  };

  // Who wrote which parts. A reply comes from the bot its user message was
  // sent to, until a handoff: the parts after it are the target's. The target's
  // answer can land in the same message, so a message may have several authors.
  const segments = new Map<string, Segment[]>();
  let current: ChatBot | undefined;
  for (const message of messages) {
    if (message.role === "user") {
      current = bots?.find((b) => b.id === message.metadata?.botId);
      continue;
    }
    const list: Segment[] = [];
    message.parts.forEach((part, i) => {
      let segment = list.at(-1);
      if (!segment || segment.author !== current) list.push((segment = { author: current, parts: [] }));
      segment.parts.push({ part, i });
      if (part.type === "tool-handoff" && part.state === "output-available") {
        current = bots?.find((b) => b.id === part.output.botId);
      }
    });
    segments.set(message.id, list);
  }

  const renderPart = (message: ChatUIMessage, m: number, part: Part, i: number) => {
    const key = `${message.id}-${i}`;
    if (part.type === "text") return <MessageResponse key={key}>{part.text}</MessageResponse>;
    if (part.type === "reasoning") {
      const live = status === "streaming" && m === messages.length - 1 && i === message.parts.length - 1;
      return (
        <Reasoning key={key} isStreaming={live}>
          <ReasoningTrigger />
          <ReasoningContent>{part.text}</ReasoningContent>
        </Reasoning>
      );
    }
    if (isToolPart(part)) return <ChatTool key={key} part={part} />;
    return null;
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Conversation className="flex-1">
        <ConversationContent>
          {messages.map((message, m) => {
            const latest = m === messages.length - 1;
            if (message.role === "user") {
              if (editingId === message.id) {
                return (
                  <Message from="user" key={message.id}>
                    <MessageEditor
                      initial={textOf(message)}
                      onCancel={() => setEditingId(undefined)}
                      onSave={(text) => {
                        setEditingId(undefined);
                        answerAgain(message, text);
                      }}
                    />
                  </Message>
                );
              }
              return (
                <Message from="user" key={message.id}>
                  {/* Block, not flex, and the text's first paragraph inline: the mention
                      shares its first line, and the bubble's width counts both. */}
                  <MessageContent className={cn(bots && "block")}>
                    {bots && <Mention bot={bots.find((b) => b.id === message.metadata?.botId)} />}
                    {message.parts.map((part, i) =>
                      part.type === "text" ? (
                        <MessageResponse key={`${message.id}-${i}`} className={cn(bots && "inline [&>p:first-child]:inline")}>
                          {part.text}
                        </MessageResponse>
                      ) : (
                        renderPart(message, m, part, i)
                      ),
                    )}
                  </MessageContent>
                  <MessageActions align="end" pinned={latest && !busy}>
                    <CopyAction text={textOf(message)} />
                    <EditAction disabled={busy} onClick={() => setEditingId(message.id)} />
                    {/* Unanswered, e.g. a failed turn after a reload, where the error card is gone. */}
                    {latest && !busy && !error && <RetryAction onClick={() => answerAgain(message)} />}
                  </MessageActions>
                </Message>
              );
            }
            const list = segments.get(message.id) ?? [];
            // The user message this reply answers; Retry is offered on the latest reply only.
            const asked = messages.slice(0, m).findLast((x) => x.role === "user");
            return list.map(({ author, parts }, s) => (
              <Message
                from={message.role}
                key={`${message.id}-${s}`}
                className={cn(author && "flex-row items-start gap-3")}
              >
                {/* Groups: the bot that wrote these parts, beside them. */}
                {author && <ChatAvatar seed={author.avatar} className="size-7" />}
                <MessageContent className={cn(author && "min-w-0 flex-1 pt-1")}>
                  {parts.map(({ part, i }) => renderPart(message, m, part, i))}
                  {s === list.length - 1 && !(latest && busy) && (
                    <MessageActions align="start" pinned={latest}>
                      <CopyAction text={textOf(message)} />
                      {latest && asked && <RetryAction onClick={() => answerAgain(asked)} />}
                    </MessageActions>
                  )}
                </MessageContent>
              </Message>
            ));
          })}
          {error && (
            <Alert variant="destructive">
              <CircleAlertIcon />
              <AlertTitle>The bot stopped partway.</AlertTitle>
              <AlertDescription>Its model or sandbox didn&apos;t respond. Try again in a moment.</AlertDescription>
              <AlertAction>
                <Button size="pill-sm" variant="surface" onClick={() => (lastUser ? answerAgain(lastUser) : regenerate(turn))}>
                  Retry
                </Button>
              </AlertAction>
            </Alert>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <PromptInput
        className="mt-4"
        onSubmit={({ text }) => {
          mention.close();
          // "@Name …" typed out without the menu still goes to that bot.
          const tagged = leadingMention(text, bots);
          const to = tagged?.bot.id ?? botId;
          const body = tagged ? tagged.rest : text;
          if (tagged) setBotId(to);
          if (body.trim()) sendMessage({ text: body, metadata: to ? { botId: to } : undefined }, to ? { metadata: { botId: to } } : undefined);
        }}
      >
        <PromptInputBody>
          <PromptInputTextarea placeholder={bots ? "Message… (@ to pick a bot)" : "Message…"} {...mention.textareaProps} />
        </PromptInputBody>
        <PromptInputFooter className={bots ? "justify-between" : "justify-end"}>
          {bots && (
            <PromptInputTools>
              <PromptInputSelect value={botId} onValueChange={(value) => typeof value === "string" && setBotId(value)}>
                <PromptInputSelectTrigger aria-label="Bot that answers" className="rounded-pill">
                  <PromptInputSelectValue>
                    {(value: unknown) => <BotOption bot={bots.find((b) => b.id === value)} />}
                  </PromptInputSelectValue>
                </PromptInputSelectTrigger>
                <PromptInputSelectContent alignItemWithTrigger={false} side="top" align="start" className="w-auto min-w-64 max-w-96 rounded-2xl p-1.5 shadow-lift">
                  {bots.map((bot) => (
                    <PromptInputSelectItem key={bot.id} value={bot.id} className="rounded-xl px-2.5 py-2">
                      <BotOption bot={bot} withJob />
                    </PromptInputSelectItem>
                  ))}
                </PromptInputSelectContent>
              </PromptInputSelect>
            </PromptInputTools>
          )}
          <PromptInputSubmit
            // The error card above reports a failed turn; the composer stays ready
            // instead of showing ai-elements' error "X", which reads as stuck.
            status={status === "error" ? "ready" : status}
            // useChat's stop() doesn't reach the agent after a resume; stopGeneration does.
            onStop={() => {
              stop();
              transport.stopGeneration(chatId);
            }}
          />
        </PromptInputFooter>
      </PromptInput>
      {mention.menu}
    </div>
  );
}

/** Which bot a group message went to: an @-mention leading its first line. */
function Mention({ bot }: { bot?: ChatBot }) {
  if (!bot) return null;
  return (
    <span
      title={bot.name}
      className="mr-1.5 inline-flex h-5 max-w-36 items-center align-top gap-1 rounded-pill bg-signal-soft pr-2 pl-0.5 text-[13px] font-medium text-signal-ink"
    >
      <ChatAvatar seed={bot.avatar} className="size-4 shrink-0" />
      <span className="truncate">@{bot.name}</span>
    </span>
  );
}

/** A bot in the picker: avatar and name; in the list, its job on a second line. */
function BotOption({ bot, withJob }: { bot?: ChatBot; withJob?: boolean }) {
  if (!bot) return null;
  if (!withJob) {
    return (
      <span className="flex items-center gap-2">
        <ChatAvatar seed={bot.avatar} className="size-5" />
        {bot.name}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-2.5">
      <ChatAvatar seed={bot.avatar} className="size-7" />
      <span className="flex flex-col">
        <span>{bot.name}</span>
        <span className="max-w-72 truncate text-[12px] text-ink-3">{bot.job}</span>
      </span>
    </span>
  );
}
