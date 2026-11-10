"use client";

import {
  ArrowRightLeftIcon,
  EyeIcon,
  KeyboardIcon,
  MonitorIcon,
  MouseIcon,
  MousePointerClickIcon,
  MoveIcon,
  type LucideIcon,
} from "lucide-react";
import { CodeBlock } from "@/components/ai-elements/code-block";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolOutput,
  type ToolPart,
} from "@/components/ai-elements/tool";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import type { ChatUIMessage } from "@/trigger/sandbox-tools";

type Part = ChatUIMessage["parts"][number];
export type ChatToolPart = Extract<Part, { type: `tool-${string}` }>;

export function isToolPart(part: Part): part is ChatToolPart {
  return part.type.startsWith("tool-");
}

const running = (state: ToolPart["state"]) => state === "input-streaming" || state === "input-available";

function clip(text: string, max = 60) {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

/** One sandbox tool call in the transcript: a collapsible card for shell and files, a single line for input. */
export function ChatTool({ part }: { part: ChatToolPart }) {
  switch (part.type) {
    case "tool-bash":
      return (
        <ToolCard part={part} title={part.input?.command ? `$ ${clip(part.input.command, 80)}` : "Running a command"}>
          {part.input?.command && <CodeBlock code={part.input.command} language="bash" />}
          {part.state === "output-available" && (
            <>
              <p className="readout">exit {part.output.exitCode}</p>
              {part.output.output && <CodeBlock code={part.output.output} language="log" />}
            </>
          )}
        </ToolCard>
      );

    case "tool-readFile":
      return (
        <ToolCard part={part} title={`Read ${part.input?.path ?? "a file"}`}>
          {part.state === "output-available" && <CodeBlock code={part.output.content} language="log" />}
        </ToolCard>
      );

    case "tool-writeFile":
      return (
        <ToolCard part={part} title={`Wrote ${part.input?.path ?? "a file"}`}>
          {part.input?.content !== undefined && <CodeBlock code={part.input.content} language="log" />}
        </ToolCard>
      );

    case "tool-listFiles":
      return (
        <ToolCard part={part} title={`Listed ${part.input?.path ?? "a folder"}`}>
          {part.state === "output-available" && (
            <CodeBlock
              code={part.output.entries.map((e) => (e.isDir ? `${e.name}/` : e.name)).join("\n") || "(empty)"}
              language="log"
            />
          )}
        </ToolCard>
      );

    case "tool-mouseClick": {
      const i = part.input;
      const label = i?.x === undefined
        ? "Clicking"
        : `${i.double ? "Double-clicked" : "Clicked"}${i.button && i.button !== "left" ? ` ${i.button}` : ""} at ${i.x}, ${i.y}`;
      return <ToolLine part={part} icon={MousePointerClickIcon} label={label} />;
    }

    case "tool-mouseMove":
      return (
        <ToolLine
          part={part}
          icon={MoveIcon}
          label={part.input?.x === undefined ? "Moving the pointer" : `Moved the pointer to ${part.input.x}, ${part.input.y}`}
        />
      );

    case "tool-mouseDrag": {
      const i = part.input;
      return (
        <ToolLine
          part={part}
          icon={MoveIcon}
          label={i?.toX === undefined ? "Dragging" : `Dragged from ${i.fromX}, ${i.fromY} to ${i.toX}, ${i.toY}`}
        />
      );
    }

    case "tool-mouseScroll":
      return (
        <ToolLine
          part={part}
          icon={MouseIcon}
          label={part.input?.direction ? `Scrolled ${part.input.direction} at ${part.input.x}, ${part.input.y}` : "Scrolling"}
        />
      );

    case "tool-keyboardType":
      return (
        <ToolLine
          part={part}
          icon={KeyboardIcon}
          label={part.input?.text ? `Typed “${clip(part.input.text)}”` : "Typing"}
        />
      );

    case "tool-keyboardPress":
      return (
        <ToolLine
          part={part}
          icon={KeyboardIcon}
          label={part.input?.key ? `Pressed ${[...(part.input.modifiers ?? []), part.input.key].join("+")}` : "Pressing a key"}
        />
      );

    // The bot's own look; the screenshot stays out of the chat.
    case "tool-viewScreen":
      return <ToolLine part={part} icon={EyeIcon} label="Looked at the screen" />;

    case "tool-showScreen":
      return <ScreenShot part={part} />;

    case "tool-handoff":
      return (
        <ToolLine
          part={part}
          icon={ArrowRightLeftIcon}
          label={
            part.state === "output-available"
              ? `Handed this to ${part.output.name}: ${part.output.reason}`
              : `Handing this to ${part.input?.to ?? "another bot"}`
          }
        />
      );

    default:
      return null;
  }
}

function ToolCard({
  part,
  title,
  children,
}: {
  part: ChatToolPart;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <Tool>
      <ToolHeader type={part.type} state={part.state} title={title} />
      <ToolContent className="flex flex-col gap-3">
        {children}
        {part.state === "output-error" && <ToolOutput output={undefined} errorText={part.errorText} />}
      </ToolContent>
    </Tool>
  );
}

function ToolLine({ part, icon: Icon, label }: { part: ChatToolPart; icon: LucideIcon; label: string }) {
  const failed = part.state === "output-error";
  return (
    <div className="flex flex-col gap-1 py-0.5 text-[13px]">
      <div className={cn("flex items-center gap-2 text-ink-2", failed && "text-critical")}>
        {running(part.state) ? <Spinner /> : <Icon className="size-3.5 shrink-0" strokeWidth={1.75} />}
        <span className="truncate">{label}</span>
      </div>
      {failed && <p className="pl-5.5 text-critical text-xs">{part.errorText}</p>}
    </div>
  );
}

function ScreenShot({ part }: { part: Extract<ChatToolPart, { type: "tool-showScreen" }> }) {
  if (part.state === "output-error") {
    return <ToolLine part={part} icon={MonitorIcon} label="Couldn't capture the screen" />;
  }
  if (part.state !== "output-available") {
    return <ToolLine part={part} icon={MonitorIcon} label="Capturing the screen" />;
  }
  const { image, width, height } = part.output;
  return (
    <figure className="flex flex-col gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element -- inline data URL, nothing to optimize */}
      <img
        src={`data:image/jpeg;base64,${image}`}
        width={width || undefined}
        height={height || undefined}
        alt="The bot's screen"
        className="h-auto w-full rounded-well ring-1 ring-border dark:ring-glass-border"
      />
      <figcaption className="readout">Screen · {width}×{height}</figcaption>
    </figure>
  );
}
