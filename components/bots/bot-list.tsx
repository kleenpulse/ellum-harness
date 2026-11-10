import { formatDistanceToNowStrict } from "date-fns";
import Link from "next/link";
import { ChatAvatar } from "@/components/chat-avatar";
import { Well } from "@/components/ui/bento";
import type { BotListItem } from "@/queries/bots";
import type { BotActivity } from "@/queries/overview";
import { SandboxPill } from "./sandbox-pill";

const ROW = "flex items-center gap-3 px-4 py-3";

/** "3 runs · 2 hours ago", or that the bot hasn't run in the last 7 days. */
export function runsNote(ran: BotActivity | undefined): string {
  return ran
    ? `${ran.runs} ${ran.runs === 1 ? "run" : "runs"} · ${formatDistanceToNowStrict(ran.lastRunAt)} ago`
    : "No runs this week";
}

/**
 * The user's bots, each row opening the bot's chat. Pass `activity` (runs in
 * the last 7 days, by bot id) to show how busy each one has been.
 */
export function BotList({ bots, activity }: { bots: BotListItem[]; activity?: Record<string, BotActivity> }) {
  return (
    <Well className="flex flex-col divide-y divide-border overflow-hidden p-0 dark:divide-glass-border">
      {bots.map((bot) => {
        const row = (
          <>
            <ChatAvatar seed={bot.avatar} />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-[13.5px] font-medium text-ink">{bot.name}</span>
              <span className="truncate text-[12px] text-ink-2">{bot.job}</span>
            </div>
            {activity ? (
              <span className="tabular hidden shrink-0 font-mono text-[11px] text-ink-3 @xl:block">
                {runsNote(activity[bot.id])}
              </span>
            ) : null}
            <SandboxPill botId={bot.id} />
          </>
        );
        return bot.chatId ? (
          <Link
            key={bot.id}
            href={`/c/${bot.chatId}`}
            className={`${ROW} outline-none transition-colors duration-200 ease-swell hover:bg-accent focus-visible:bg-accent`}
          >
            {row}
          </Link>
        ) : (
          <div key={bot.id} className={ROW}>
            {row}
          </div>
        );
      })}
    </Well>
  );
}
