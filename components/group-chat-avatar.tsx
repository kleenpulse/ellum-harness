import { ChatAvatar } from "@/components/chat-avatar";
import { cn } from "@/lib/utils";

const VISIBLE = 3;

// Slots per member count, in % of the square: two overlap on the diagonal,
// three form a triangle, four or more fill a 2x2 grid with a count in the last cell.
const SLOTS: Record<number, string[]> = {
  2: ["top-0 left-0 size-[62%]", "right-0 bottom-0 size-[62%]"],
  3: ["top-0 left-[23%] size-[54%]", "bottom-0 left-0 size-[54%]", "right-0 bottom-0 size-[54%]"],
  4: ["top-0 left-0 size-[48%]", "top-0 right-0 size-[48%]", "bottom-0 left-0 size-[48%]", "right-0 bottom-0 size-[48%]"],
};

/**
 * A chat's face: one bot's avatar, or up to three for a group with the rest
 * counted. Takes the same box as `ChatAvatar`, so `className` sizes swap 1:1.
 */
export function GroupChatAvatar({ seeds, className }: { seeds: string[]; className?: string }) {
  if (seeds.length <= 1) return <ChatAvatar seed={seeds[0] ?? ""} className={className} />;

  const slots = SLOTS[Math.min(seeds.length, 4)];
  const hidden = seeds.length - VISIBLE;

  return (
    <span aria-hidden className={cn("@container relative block size-8 shrink-0", className)}>
      {seeds.slice(0, VISIBLE).map((seed, i) => (
        <ChatAvatar key={`${seed}-${i}`} seed={seed} className={cn("absolute", slots[i])} />
      ))}
      {hidden > 0 && (
        <span
          className={cn(
            "absolute grid place-items-center rounded-full bg-card font-medium text-ink-2 tabular-nums ring-1 ring-border dark:ring-glass-border",
            "text-[22cqw] leading-none",
            slots[3],
          )}
        >
          +{hidden}
        </span>
      )}
    </span>
  );
}
