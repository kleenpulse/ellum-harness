"use client";

import { CheckIcon, CopyIcon, PencilIcon, RotateCcwIcon } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupTextarea } from "@/components/ui/input-group";
import { Tip, TooltipGroup } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * The row under a bubble. On fine pointers it shows while the message is
 * hovered or focused, and always on the latest message; touch always shows it.
 */
export function MessageActions({
  align,
  pinned,
  children,
}: {
  align: "start" | "end";
  /** Keep visible without hover (the latest message). */
  pinned?: boolean;
  children: ReactNode;
}) {
  return (
    <TooltipGroup side="bottom">
      <div
        className={cn(
          "-mt-1 flex items-center gap-0.5 transition-opacity duration-150",
          align === "end" ? "justify-end" : "justify-start",
          !pinned && "pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100 pointer-fine:focus-within:opacity-100",
        )}
      >
        {children}
      </div>
    </TooltipGroup>
  );
}

export function MessageAction({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <Tip
      label={label}
      render={
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={label}
          disabled={disabled}
          onClick={onClick}
          className="rounded-full text-ink-3 hover:text-ink [&_svg]:size-3.5"
        />
      }
    >
      {children}
    </Tip>
  );
}

export function CopyAction({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(t);
  }, [copied]);

  return (
    <MessageAction
      label={copied ? "Copied" : "Copy"}
      disabled={!text}
      onClick={() => navigator.clipboard.writeText(text).then(() => setCopied(true))}
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
    </MessageAction>
  );
}

export function EditAction({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <MessageAction label="Edit" onClick={onClick} disabled={disabled}>
      <PencilIcon />
    </MessageAction>
  );
}

export function RetryAction({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <MessageAction label="Retry" onClick={onClick} disabled={disabled}>
      <RotateCcwIcon />
    </MessageAction>
  );
}

/** A user message being rewritten in place. Enter sends, Shift+Enter breaks the line, Escape cancels. */
export function MessageEditor({
  initial,
  onCancel,
  onSave,
}: {
  initial: string;
  onCancel: () => void;
  onSave: (text: string) => void;
}) {
  const [text, setText] = useState(initial);
  const ref = useRef<HTMLTextAreaElement>(null);
  const changed = text.trim().length > 0 && text.trim() !== initial.trim();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, []);

  return (
    <InputGroup className="ml-auto w-full max-w-xl rounded-[18px] bg-sheet">
      <InputGroupTextarea
        ref={ref}
        value={text}
        aria-label="Edit message"
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") onCancel();
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            if (changed) onSave(text.trim());
          }
        }}
        className="max-h-48 min-h-16 resize-none overflow-y-auto text-sm"
      />
      <InputGroupAddon align="block-end" className="justify-end gap-2">
        <Button type="button" size="pill-sm" variant="surface" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" size="pill-sm" disabled={!changed} onClick={() => onSave(text.trim())}>
          Send
        </Button>
      </InputGroupAddon>
    </InputGroup>
  );
}
