"use client";

import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import type { TriggerChatTransport } from "@trigger.dev/sdk/chat";
import { useLoadTranscript, useTriggerChatTransport } from "@trigger.dev/sdk/chat/react";
import { loadChatTranscript, mintChatAccessToken, startChatSession } from "@/actions/chat";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import type { chatAgent } from "@/trigger/chat";

/** Chat against the Trigger.dev chat agent. History comes from the agent's transcript storage. */
export function Chat({ chatId }: { chatId: string }) {
  const transport = useTriggerChatTransport<typeof chatAgent>({
    task: "chat",
    accessToken: ({ chatId }) => mintChatAccessToken(chatId),
    startSession: ({ chatId, clientData }) => startChatSession({ chatId, clientData }),
  });
  const { messages, isLoading, error } = useLoadTranscript(chatId, loadChatTranscript, { transport });

  if (error) throw error;
  if (isLoading) return null;

  // Keyed by chatId so useChat remounts with the loaded history instead of carrying messages across.
  return <ChatView key={chatId} chatId={chatId} initialMessages={messages} transport={transport} />;
}

function ChatView({
  chatId,
  initialMessages,
  transport,
}: {
  chatId: string;
  initialMessages: UIMessage[];
  transport: TriggerChatTransport;
}) {
  const { messages, sendMessage, status, stop } = useChat({
    id: chatId,
    messages: initialMessages,
    transport,
    // Reconnects to an answer still streaming from before a reload.
    resume: initialMessages.length > 0,
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Conversation className="flex-1">
        <ConversationContent>
          {messages.map((message) => (
            <Message from={message.role} key={message.id}>
              <MessageContent>
                {message.parts.map((part, i) =>
                  part.type === "text" ? (
                    <MessageResponse key={`${message.id}-${i}`}>{part.text}</MessageResponse>
                  ) : null,
                )}
              </MessageContent>
            </Message>
          ))}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <PromptInput
        className="mt-4"
        onSubmit={({ text }) => {
          if (text.trim()) sendMessage({ text });
        }}
      >
        <PromptInputBody>
          <PromptInputTextarea placeholder="Message…" />
        </PromptInputBody>
        <PromptInputFooter className="justify-end">
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
