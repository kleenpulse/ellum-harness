import { formatDistanceToNowStrict } from "date-fns";
import Link from "next/link";
import { GroupChatAvatar } from "@/components/group-chat-avatar";
import { Bento, BentoTitle, Caption, Well } from "@/components/ui/bento";
import type { ChatListItem } from "@/queries/chats";

const SHOWN = 5;

/** The chats with the latest activity, as a way back into them. Renders nothing without chats. */
export function RecentChats({ chats, i }: { chats: ChatListItem[]; i?: number }) {
  if (!chats.length) return null;

  return (
    <Bento i={i} className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <BentoTitle>Recent chats</BentoTitle>
        <Caption>latest first</Caption>
      </div>
      <Well className="flex flex-col divide-y divide-border overflow-hidden p-0 dark:divide-glass-border">
        {chats.slice(0, SHOWN).map((chat) => (
          <Link
            key={chat.id}
            href={`/c/${chat.id}`}
            className="flex items-center gap-3 px-4 py-3 outline-none transition-colors duration-200 ease-swell hover:bg-accent focus-visible:bg-accent"
          >
            <GroupChatAvatar seeds={chat.avatars} />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-[13.5px] font-medium text-ink">{chat.name}</span>
              <span className="truncate text-[12px] text-ink-2">{chat.preview ?? "No messages yet"}</span>
            </div>
            <time
              dateTime={chat.lastMessageAt.toISOString()}
              className="tabular shrink-0 font-mono text-[11px] text-ink-3"
            >
              {formatDistanceToNowStrict(chat.lastMessageAt)} ago
            </time>
          </Link>
        ))}
      </Well>
    </Bento>
  );
}
