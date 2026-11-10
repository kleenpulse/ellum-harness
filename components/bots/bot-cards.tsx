import Link from "next/link";
import { ChatAvatar } from "@/components/chat-avatar";
import { Bento } from "@/components/ui/bento";
import type { BotListItem } from "@/queries/bots";
import type { BotActivity } from "@/queries/overview";
import { runsNote } from "./bot-list";
import { SandboxPill } from "./sandbox-pill";

/** The user's bots as a grid of cards, each opening the bot's chat. */
export function BotCards({ bots, activity }: { bots: BotListItem[]; activity?: Record<string, BotActivity> }) {
  return (
    <ul className="grid grid-cols-1 gap-4 @xl:grid-cols-2 @4xl:grid-cols-3">
      {bots.map((bot, i) => {
        const card = (
          <Bento i={i} className="flex h-full flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <ChatAvatar seed={bot.avatar} className="size-12" />
              <SandboxPill botId={bot.id} />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <h2 className="truncate font-display text-[17px] leading-tight tracking-[-0.01em] text-ink">
                {bot.name}
              </h2>
              <p className="line-clamp-2 text-[13px] leading-snug text-ink-2">{bot.job}</p>
            </div>
            {activity ? (
              <p className="tabular border-t border-border pt-3 font-mono text-[11px] text-ink-3 dark:border-glass-border">
                {runsNote(activity[bot.id])}
              </p>
            ) : null}
          </Bento>
        );
        return (
          <li key={bot.id} className="min-w-0">
            {bot.chatId ? (
              <Link
                href={`/c/${bot.chatId}`}
                className="lift block h-full rounded-card outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {card}
              </Link>
            ) : (
              card
            )}
          </li>
        );
      })}
    </ul>
  );
}
