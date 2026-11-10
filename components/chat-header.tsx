import { BotDialog } from "@/components/bot-dialog";
import { DesktopPanelToggle } from "@/components/desktop-panel";
import { GroupChatAvatar } from "@/components/group-chat-avatar";
import { PAGE_SUBTITLE, PAGE_TITLE } from "@/components/shell/page-frame";
import { cn } from "@/lib/utils";
import type { ChatDetail } from "@/queries/chats";

const row = "-ml-2 flex min-w-0 shrink items-center justify-start gap-3 rounded-pill py-1.5 pr-4 pl-2 text-left";

/**
 * A chat's header on the canvas. Direct: the bot's face and name (opens its
 * editor) and the desktop control. Group: the members' faces and names.
 */
export function ChatHeader({ chat }: { chat: ChatDetail }) {
  const [bot] = chat.bots;
  const group = chat.kind === "group";
  const title = (
    <>
      <GroupChatAvatar seeds={chat.bots.map((b) => b.avatar)} className="size-10 shrink-0 sm:size-12" />
      <span className="flex min-w-0 flex-col">
        <span className={PAGE_TITLE} title={chat.name}>
          {chat.name}
        </span>
        <span className={PAGE_SUBTITLE}>
          {group ? chat.bots.map((b) => b.name).join(", ") : bot.job}
        </span>
      </span>
    </>
  );

  return (
    <header className="entrance flex items-center justify-between gap-4">
      {/* A heading can't live inside the button, so the page title is read separately. */}
      <h1 className="sr-only">{chat.name}</h1>
      {group ? (
        <div className={row}>{title}</div>
      ) : (
        <>
          <BotDialog
            bot={bot}
            variant="ghost"
            className={cn(row, "h-auto font-normal")}
            aria-label={`Edit ${bot.name}`}
          >
            {title}
          </BotDialog>
          <DesktopPanelToggle />
        </>
      )}
    </header>
  );
}
