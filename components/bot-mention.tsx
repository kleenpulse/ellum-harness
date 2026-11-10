"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ChatAvatar } from "@/components/chat-avatar";
import { cn } from "@/lib/utils";

export type MentionBot = { id: string; name: string; avatar: string; job: string };

// A query this long is a sentence, not a name being typed.
const QUERY_MAX = 40;
const MENU_WIDTH = 288;
const GAP = 6;
const EDGE = 8;

/** Bots matching what follows the "@": name prefixes first, then names containing it. */
function match(bots: MentionBot[], query: string) {
  const q = query.toLowerCase();
  const starts = bots.filter((b) => b.name.toLowerCase().startsWith(q));
  // Past a space the user is typing a multi-word name; only prefixes count.
  if (/\s/.test(q)) return starts;
  return [...starts, ...bots.filter((b) => !starts.includes(b) && b.name.toLowerCase().includes(q))];
}

/** The "@query" the caret is in: an "@" at the start or after whitespace (not an email). */
function tokenAt(value: string, caret: number) {
  const m = /(?:^|\s)@([^@\n]*)$/.exec(value.slice(0, caret));
  if (!m || m[1].length > QUERY_MAX) return undefined;
  return { start: caret - m[1].length - 1, end: caret, query: m[1] };
}

const MIRRORED = [
  "boxSizing", "width", "borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth",
  "paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "fontStyle", "fontVariant", "fontWeight",
  "fontStretch", "fontSize", "lineHeight", "fontFamily", "textAlign", "textTransform", "textIndent",
  "letterSpacing", "wordSpacing", "tabSize", "wordBreak", "overflowWrap",
] as const;

/** Viewport rect of the character at `index`: a hidden copy of the textarea, measured. */
function caretRect(textarea: HTMLTextAreaElement, index: number) {
  const style = getComputedStyle(textarea);
  const mirror = document.createElement("div");
  for (const prop of MIRRORED) mirror.style[prop] = style[prop];
  Object.assign(mirror.style, {
    position: "absolute",
    visibility: "hidden",
    top: "0",
    left: "-9999px",
    whiteSpace: "pre-wrap",
    overflow: "hidden",
  });
  mirror.textContent = textarea.value.slice(0, index);
  const mark = document.createElement("span");
  mark.textContent = textarea.value[index] ?? ".";
  mirror.append(mark);
  document.body.append(mirror);
  const box = textarea.getBoundingClientRect();
  const top = box.top + parseFloat(style.borderTopWidth) + mark.offsetTop - textarea.scrollTop;
  const left = box.left + parseFloat(style.borderLeftWidth) + mark.offsetLeft - textarea.scrollLeft;
  const height = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.4;
  mirror.remove();
  return { top, left, height };
}

type Open = { start: number; end: number; query: string; anchor: { top: number; left: number; height: number } };

/**
 * "@" in the composer picks the bot a message goes to. Picking removes the
 * "@query" text and calls `onPick`; the message itself names the bot through
 * its metadata, shown as a mention chip once sent.
 */
export function useBotMention(bots: MentionBot[] | undefined, onPick: (bot: MentionBot) => void) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [open, setOpen] = useState<Open>();
  const [active, setActive] = useState(0);
  // Esc closes the menu for this "@" only; a new one opens it again.
  const [dismissed, setDismissed] = useState<number>();
  const listId = useId();

  const matches = open && bots ? match(bots, open.query) : [];
  const shown = matches.length > 0;
  const index = Math.min(active, matches.length - 1);

  function update() {
    const textarea = ref.current;
    if (!textarea || !bots?.length || textarea.selectionStart !== textarea.selectionEnd) return setOpen(undefined);
    const token = tokenAt(textarea.value, textarea.selectionStart);
    if (!token || token.start === dismissed) {
      if (!token) setDismissed(undefined);
      return setOpen(undefined);
    }
    if (token.query !== open?.query || token.start !== open?.start) setActive(0);
    setOpen({ ...token, anchor: caretRect(textarea, token.start) });
  }

  function pick(bot: MentionBot) {
    const textarea = ref.current;
    if (!textarea || !open) return;
    textarea.focus();
    // Swallow one space after the token so "@Li| hello" doesn't leave a gap.
    const end = textarea.value[open.end] === " " ? open.end + 1 : open.end;
    textarea.setSelectionRange(open.start, end);
    // execCommand keeps the edit on the undo stack; setRangeText is the fallback.
    if (!document.execCommand("delete")) {
      textarea.setRangeText("", open.start, end, "end");
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
    }
    setOpen(undefined);
    onPick(bot);
  }

  // The anchor moves when the textarea scrolls or the window resizes.
  useEffect(() => {
    if (!open) return;
    const textarea = ref.current;
    const follow = () => {
      if (textarea) setOpen((o) => o && { ...o, anchor: caretRect(textarea, o.start) });
    };
    textarea?.addEventListener("scroll", follow);
    window.addEventListener("resize", follow);
    window.addEventListener("scroll", follow, true);
    return () => {
      textarea?.removeEventListener("scroll", follow);
      window.removeEventListener("resize", follow);
      window.removeEventListener("scroll", follow, true);
    };
  }, [open?.start]); // eslint-disable-line react-hooks/exhaustive-deps -- only re-bind per token

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (!shown || !open || e.nativeEvent.isComposing) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive((index + step + matches.length) % matches.length);
    } else if (e.key === "Enter" || e.key === "Tab") {
      // Prevented, so the composer doesn't submit.
      e.preventDefault();
      pick(matches[index]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setDismissed(open.start);
      setOpen(undefined);
    }
  }

  const textareaProps = bots?.length
    ? {
        ref,
        onKeyDown,
        onChange: update,
        onSelect: update,
        onBlur: () => setOpen(undefined),
        role: "combobox" as const,
        "aria-autocomplete": "list" as const,
        "aria-expanded": shown,
        "aria-controls": shown ? listId : undefined,
        "aria-activedescendant": shown ? `${listId}-${index}` : undefined,
      }
    : {};

  let menu: ReactNode = null;
  if (shown && open) {
    const { top, left, height } = open.anchor;
    const estimate = Math.min(matches.length, 6) * 52 + 12;
    const above = top - GAP - estimate >= EDGE;
    const x = Math.max(EDGE, Math.min(left - 10, window.innerWidth - MENU_WIDTH - EDGE));
    menu = createPortal(
      <div
        id={listId}
        role="listbox"
        aria-label="Bots"
        style={{
          width: MENU_WIDTH,
          left: x,
          ...(above ? { bottom: window.innerHeight - top + GAP } : { top: top + height + GAP }),
        }}
        className="fixed z-50 max-h-80 overflow-y-auto rounded-2xl bg-popover p-1.5 text-popover-foreground shadow-lift ring-1 ring-foreground/10"
        // Keep focus (and the mobile keyboard) in the textarea.
        onPointerDown={(e) => e.preventDefault()}
      >
        {matches.map((bot, i) => (
          <div
            key={bot.id}
            id={`${listId}-${i}`}
            role="option"
            aria-selected={i === index}
            onPointerEnter={() => setActive(i)}
            onClick={() => pick(bot)}
            className={cn(
              "flex cursor-default items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm",
              i === index && "bg-accent text-accent-foreground",
            )}
          >
            <ChatAvatar seed={bot.avatar} className="size-7 shrink-0" />
            <span className="flex min-w-0 flex-col">
              <span className="truncate">{bot.name}</span>
              <span className="truncate text-[12px] text-ink-3">{bot.job}</span>
            </span>
          </div>
        ))}
      </div>,
      document.body,
    );
  }

  return { textareaProps, menu, close: () => setOpen(undefined) };
}

/** A message typed as "@Name rest" goes to that bot: the bot and the text without the mention. */
export function leadingMention(text: string, bots: MentionBot[] | undefined) {
  const trimmed = text.trimStart();
  const lower = trimmed.toLowerCase();
  // Longest names first, so "@Ada Lovelace" beats "@Ada".
  for (const bot of [...(bots ?? [])].sort((a, b) => b.name.length - a.name.length)) {
    const tag = `@${bot.name.toLowerCase()}`;
    if (lower.startsWith(tag) && !/[\p{L}\p{N}_]/u.test(trimmed[tag.length] ?? "")) {
      return { bot, rest: trimmed.slice(tag.length).replace(/^[\s,:]+/, "") };
    }
  }
}
