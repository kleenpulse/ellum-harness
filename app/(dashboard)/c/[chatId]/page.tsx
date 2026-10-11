import { notFound } from "next/navigation";
import { Chat } from "@/components/chat";
import { ChatHeader } from "@/components/chat-header";
import { DesktopPanel, DesktopPanelHandle, DesktopPanelProvider } from "@/components/desktop-panel";
import { PAGE_COLUMN } from "@/components/shell/page-frame";
import { ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { cn } from "@/lib/utils";
import { getChat } from "@/queries/chats";

export default async function ChatPage({ params }: PageProps<"/c/[chatId]">) {
  const { chatId } = await params;
  const chat = await getChat(chatId);
  if (!chat) notFound();

  return (
    <DesktopPanelProvider chatId={chat.id}>
      {/* Fixed to the viewport so the conversation scrolls inside the sheet, not the page.
          On a wrapper: the group's inline height: 100% beats an h-svh class on the group itself. */}
      <div className="h-svh">
        <ResizablePanelGroup>
          <ResizablePanel id="chat" minSize="30" className="flex flex-col">
            <div className={cn(PAGE_COLUMN, "py-6")}>
              <ChatHeader chat={chat} />
            </div>
            <div className="flex min-h-0 flex-1 flex-col rounded-t-frame bg-sheet dark:border-t dark:border-glass-border">
              <div className={cn(PAGE_COLUMN, "flex min-h-0 flex-1 flex-col py-6")}>
                <Chat chatId={chat.id} />
              </div>
            </div>
          </ResizablePanel>
          <DesktopPanelHandle />
          <DesktopPanel botName={chat.bot.name} />
        </ResizablePanelGroup>
      </div>
    </DesktopPanelProvider>
  );
}
