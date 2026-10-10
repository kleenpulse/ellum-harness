import { notFound } from "next/navigation";
import { Chat } from "@/components/chat";
import { ChatHeader } from "@/components/chat-header";
import { PAGE_COLUMN } from "@/components/shell/page-frame";
import { cn } from "@/lib/utils";
import { getChat } from "@/queries/chats";

export default async function ChatPage({ params }: PageProps<"/c/[chatId]">) {
  const { chatId } = await params;
  const chat = await getChat(chatId);
  if (!chat) notFound();

  return (
    // Fixed to the viewport so the conversation scrolls inside the sheet, not the page.
    <div className="flex h-svh flex-col">
      <div className={cn(PAGE_COLUMN, "py-6")}>
        <ChatHeader chat={chat} />
      </div>
      <div className="flex min-h-0 flex-1 flex-col rounded-t-frame bg-sheet dark:border-t dark:border-glass-border">
        <div className={cn(PAGE_COLUMN, "flex min-h-0 flex-1 flex-col py-6")}>
          <Chat chatId={chat.id} />
        </div>
      </div>
    </div>
  );
}
