import { BotDialog } from "@/components/bot-dialog";
import { DesktopPanelToggle } from "@/components/desktop-panel";
import { GroupChatAvatar } from "@/components/group-chat-avatar";
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
      <GroupChatAvatar seeds={chat.bots.map((b) => b.avatar)} className="size-12" />
      <span className="flex min-w-0 flex-col">
        <span className="truncate font-title text-[32px] font-bold uppercase leading-tight tracking-[-0.03em] text-ink">
          {chat.name}
        </span>
        <span className="mt-1 truncate text-[15px] text-ink-2">
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
