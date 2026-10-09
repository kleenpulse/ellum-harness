"use client"

import * as React from "react"
import { cn } from "cn"

import {
  InputGroup,
  InputGroupAddon,
  InputGroupTextarea,
} from "@/components/ui/input-group"

type CountedTextareaProps = Omit<React.ComponentProps<"textarea">, "maxLength"> & {
  /** Character limit shown in the counter. */
  max: number
  /** Stop input at `max` (default). When false, typing past it is allowed and the counter turns critical. */
  enforce?: boolean
  /** Fraction of `max` at which the counter turns to a warning. */
  warnAt?: number
  /** Extra classes for the group (the visible box); `className` goes to the textarea. */
  wrapperClassName?: string
}

/**
 * shadcn's Textarea in an InputGroup: fixed-size (no resize handle), grows with
 * content up to a cap and then scrolls, with a live `count / max` in a footer
 * row the text never runs under.
 */
function CountedTextarea({
  max,
  enforce = true,
  warnAt = 0.9,
  className,
  wrapperClassName,
  value,
  defaultValue,
  onChange,
  "aria-describedby": describedBy,
  ref: forwardedRef,
  ...props
}: CountedTextareaProps) {
  const counterId = React.useId()
  const ref = React.useRef<HTMLTextAreaElement>(null)
  // Tracks uncontrolled input; a controlled `value` always wins.
  const [draft, setDraft] = React.useState(String(defaultValue ?? ""))
  const count = (value === undefined ? draft : String(value ?? "")).length
  const tone = count > max ? "over" : count >= max * warnAt ? "near" : "ok"

  return (
    <InputGroup data-slot="counted-textarea" className={wrapperClassName}>
      <InputGroupTextarea
        ref={(node) => {
          ref.current = node
          if (typeof forwardedRef === "function") forwardedRef(node)
          else if (forwardedRef) forwardedRef.current = node
        }}
        value={value}
        defaultValue={defaultValue}
        maxLength={enforce ? max : undefined}
        aria-describedby={cn(describedBy, counterId) || undefined}
        onChange={(e) => {
          if (value === undefined) setDraft(e.target.value)
          onChange?.(e)
        }}
        className={cn("max-h-48 resize-none overflow-y-auto", className)}
        {...props}
      />
      <InputGroupAddon
        align="block-end"
        // The stock addon focuses an <input>; point it at the textarea.
        onClick={() => ref.current?.focus()}
        className="cursor-text justify-end"
      >
        <span
          id={counterId}
          data-tone={tone}
          className="font-mono text-[10.5px] text-ink-3 tabular data-[tone=near]:text-warn data-[tone=over]:text-critical"
        >
          {count.toLocaleString()} / {max.toLocaleString()}
          <span className="sr-only"> characters</span>
        </span>
      </InputGroupAddon>
    </InputGroup>
  )
}

export { CountedTextarea, type CountedTextareaProps }
