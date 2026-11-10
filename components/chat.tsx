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
import { cn } from "@/lib/utils";
import type { ChatUIMessage } from "@/trigger/sandbox-tools";

type ChatBot = { id: string; name: string; avatar: string };

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

  const { messages, sendMessage, status, stop, error, regenerate } = useChat<ChatUIMessage>({
    id: chatId,
    messages: initialMessages,
    transport,
    // Reconnects to an answer still streaming from before a reload.
    resume: initialMessages.length > 0,
  });

  // A reply comes from the bot its user message was sent to.
  const repliedBy = new Map<string, ChatBot>();
  if (bots) {
    let current: ChatBot | undefined;
    for (const message of messages) {
      if (message.role === "user") current = bots.find((b) => b.id === message.metadata?.botId);
      else if (current) repliedBy.set(message.id, current);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Conversation className="flex-1">
        <ConversationContent>
          {messages.map((message, m) => {
            const author = repliedBy.get(message.id);
            return (
              <Message from={message.role} key={message.id} className={cn(author && "flex-row items-start gap-3")}>
                {bots && message.role === "user" && <SentTo bot={bots.find((b) => b.id === message.metadata?.botId)} />}
                {/* Groups: the bot that wrote the reply, beside it. */}
                {author && <ChatAvatar seed={author.avatar} className="size-7" />}
                <MessageContent className={cn(author && "min-w-0 flex-1 pt-1")}>
                  {message.parts.map((part, i) => {
                    const key = `${message.id}-${i}`;
                    if (part.type === "text") return <MessageResponse key={key}>{part.text}</MessageResponse>;
                    if (part.type === "reasoning") {
                      const live =
                        status === "streaming" && m === messages.length - 1 && i === message.parts.length - 1;
                      return (
                        <Reasoning key={key} isStreaming={live}>
                          <ReasoningTrigger />
                          <ReasoningContent>{part.text}</ReasoningContent>
                        </Reasoning>
                      );
                    }
                    if (isToolPart(part)) return <ChatTool key={key} part={part} />;
                    return null;
                  })}
                </MessageContent>
              </Message>
            );
          })}
          {error && (
            <Alert variant="destructive">
              <CircleAlertIcon />
              <AlertTitle>The bot stopped partway.</AlertTitle>
              <AlertDescription>Its model or sandbox didn&apos;t respond. Try again in a moment.</AlertDescription>
              <AlertAction>
                <Button size="pill-sm" variant="surface" onClick={() => regenerate(turn)}>
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
          if (text.trim()) sendMessage({ text, metadata: botId ? { botId } : undefined }, turn);
        }}
      >
        <PromptInputBody>
          <PromptInputTextarea placeholder="Message…" />
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
                <PromptInputSelectContent alignItemWithTrigger={false} side="top" align="start" className="rounded-2xl p-1.5 shadow-lift">
                  {bots.map((bot) => (
                    <PromptInputSelectItem key={bot.id} value={bot.id} className="rounded-xl px-2.5 py-2">
                      <BotOption bot={bot} />
                    </PromptInputSelectItem>
                  ))}
                </PromptInputSelectContent>
              </PromptInputSelect>
            </PromptInputTools>
          )}
          <PromptInputSubmit
            status={status}
            // useChat's stop() doesn't reach the agent after a resume; stopGeneration does.
            onStop={() => {
              stop();
              transport.stopGeneration(chatId);
            }}
          />
        </PromptInputFooter>
      </PromptInput>
    </div>
  );
}

/** Which bot a group message went to, above its bubble. */
function SentTo({ bot }: { bot?: ChatBot }) {
  if (!bot) return null;
  return <span className="ml-auto max-w-48 truncate text-[12px] text-ink-3">To {bot.name}</span>;
}

function BotOption({ bot }: { bot?: ChatBot }) {
  if (!bot) return null;
  return (
    <span className="flex items-center gap-2">
      <ChatAvatar seed={bot.avatar} className="size-5" />
      {bot.name}
    </span>
  );
}
