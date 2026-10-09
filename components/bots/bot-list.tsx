import { ChatAvatar } from "@/components/chat-avatar";
import { Well } from "@/components/ui/bento";
import { StatusPill } from "@/components/ui/status-pill";
import type { BotListItem } from "@/queries/bots";

export function BotList({ bots }: { bots: BotListItem[] }) {
  return (
    <Well className="flex flex-col divide-y divide-border p-0 dark:divide-glass-border">
      {bots.map((bot) => (
        <div key={bot.id} className="flex items-center gap-3 px-4 py-3">
          <ChatAvatar seed={bot.avatar} />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-[13.5px] font-medium text-ink">{bot.name}</span>
            <span className="truncate text-[12px] text-ink-2">{bot.job}</span>
          </div>
          {bot.hasSandbox ? (
            <StatusPill tone="ok">Ready</StatusPill>
          ) : (
            <StatusPill tone="idle">No sandbox</StatusPill>
          )}
        </div>
      ))}
    </Well>
  );
}
