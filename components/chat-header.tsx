import { BotDialog } from "@/components/bot-dialog";
import { ChatAvatar } from "@/components/chat-avatar";
import { DesktopPanelToggle } from "@/components/desktop-panel";
import type { ChatDetail } from "@/queries/chats";

/** A chat's header on the canvas: the bot's face and name left (opens its editor), the desktop control right. */
export function ChatHeader({ chat }: { chat: ChatDetail }) {
  return (
    <header className="entrance flex items-center justify-between gap-4">
      {/* A heading can't live inside the button, so the page title is read separately. */}
      <h1 className="sr-only">{chat.name}</h1>
      <BotDialog
        bot={chat.bot}
        variant="ghost"
        className="-ml-2 h-auto min-w-0 shrink justify-start gap-3 rounded-pill py-1.5 pr-4 pl-2 text-left font-normal"
        aria-label={`Edit ${chat.bot.name}`}
      >
        <ChatAvatar seed={chat.bot.avatar} className="size-10" />
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-display text-[22px] leading-tight tracking-[-0.01em] text-ink">
            {chat.name}
          </span>
          <span className="truncate text-[13px] text-ink-2">{chat.bot.job}</span>
        </span>
      </BotDialog>
      <DesktopPanelToggle />
    </header>
  );
}
