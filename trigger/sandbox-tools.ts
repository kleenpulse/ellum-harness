import type { Sandbox } from "@daytona/sdk";
import { tool, type InferUITools, type UIDataTypes, type UIMessage } from "ai";
import { z } from "zod";
import { ensureDesktop } from "@/lib/daytona/client";
import type { HandoffTool } from "./handoff";

// Keeps one big command or file from flooding the model's context.
const OUTPUT_MAX = 16_000;

function clip(text: string) {
  if (text.length <= OUTPUT_MAX) return { text, truncated: false };
  const half = OUTPUT_MAX / 2;
  return { text: `${text.slice(0, half)}\n…[truncated]…\n${text.slice(-half)}`, truncated: true };
}

// Positions are on a 0–1000 grid, not pixels: vision models locate things on
// that grid natively (dots-3 clicked ~1.33x low in y when asked for pixels).
const GRID = 1000;
const coord = (axis: "x" | "y") =>
  z
    .number()
    .min(0)
    .max(GRID)
    .describe(axis === "x" ? "0 = left edge, 1000 = right edge." : "0 = top edge, 1000 = bottom edge.");
const point = { x: coord("x"), y: coord("y") };

type Screenshot = { image: string; width: number; height: number };

async function screenshot(sandbox: Sandbox): Promise<Screenshot> {
  await ensureDesktop(sandbox);
  // Full resolution so the model's coordinates map 1:1 onto the screen.
  const [{ screenshot }, { displays }] = await Promise.all([
    sandbox.computerUse.screenshot.takeCompressed({ format: "jpeg", quality: 70, showCursor: true }),
    sandbox.computerUse.display.getInfo(),
  ]);
  if (!screenshot) throw new Error("The screenshot came back empty.");
  const display = displays?.[0];
  return { image: screenshot, width: display?.width ?? 0, height: display?.height ?? 0 };
}

function screenshotForModel({ output }: { output: Screenshot }) {
  return {
    type: "content" as const,
    value: [
      {
        type: "text" as const,
        text: "Screenshot of your screen. Give mouse positions on a 0–1000 grid over this image (x left→right, y top→bottom).",
      },
      { type: "file" as const, mediaType: "image/jpeg", data: { type: "data" as const, data: output.image } },
    ],
  };
}

/** The bot's sandbox tools. `sandbox` resolves lazily so a turn without tool calls never touches Daytona. */
export function createSandboxTools(sandbox: () => Promise<Sandbox>) {
  // The grid maps onto the real display; its size is read once per turn.
  let size: Promise<{ width: number; height: number }> | undefined;
  const desktop = async () => {
    const s = await sandbox();
    await ensureDesktop(s);
    size ??= s.computerUse.display.getInfo().then(({ displays }) => ({
      width: displays?.[0]?.width ?? 1024,
      height: displays?.[0]?.height ?? 768,
    }));
    const { width, height } = await size;
    const px = (x: number, y: number) =>
      [Math.round((x / GRID) * (width - 1)), Math.round((y / GRID) * (height - 1))] as const;
    return { cu: s.computerUse, px };
  };

  return {
    bash: tool({
      description:
        "Run a shell command in your sandbox and get its output. Runs in /home/daytona unless you pass cwd. Blocks until the command exits, so start GUI apps and servers in the background (`nohup cmd > /tmp/cmd.log 2>&1 &`).",
      inputSchema: z.object({
        command: z.string().min(1),
        cwd: z.string().optional().describe("Working directory. Defaults to /home/daytona."),
        timeout: z.number().int().min(1).max(300).default(60).describe("Seconds before the command is killed."),
      }),
      execute: async ({ command, cwd, timeout }) => {
        const s = await sandbox();
        // Desktop first, or a GUI app launched here dies with "Missing X server".
        // Once it's up this is one status call.
        await ensureDesktop(s);
        const res = await s.process.executeCommand(command, cwd, { DISPLAY: ":0" }, timeout);
        const { text, truncated } = clip(res.result ?? "");
        return { exitCode: res.exitCode, output: text, truncated };
      },
    }),

    readFile: tool({
      description: "Read a text file from your sandbox. Relative paths resolve from /home/daytona.",
      inputSchema: z.object({ path: z.string().min(1) }),
      execute: async ({ path }) => {
        const buffer = await (await sandbox()).fs.downloadFile(path);
        if (buffer.includes(0)) throw new Error(`${path} is a binary file.`);
        const { text, truncated } = clip(buffer.toString("utf8"));
        return { path, content: text, truncated };
      },
    }),

    writeFile: tool({
      description:
        "Create or overwrite a text file in your sandbox. Relative paths resolve from /home/daytona.",
      inputSchema: z.object({ path: z.string().min(1), content: z.string() }),
      execute: async ({ path, content }) => {
        const buffer = Buffer.from(content, "utf8");
        await (await sandbox()).fs.uploadFile(buffer, path);
        return { path, bytes: buffer.byteLength };
      },
    }),

    listFiles: tool({
      description: "List a directory in your sandbox. Relative paths resolve from /home/daytona.",
      inputSchema: z.object({ path: z.string().default(".") }),
      execute: async ({ path }) => {
        const files = await (await sandbox()).fs.listFiles(path);
        return {
          path,
          entries: files.map((f) => ({ name: f.name, isDir: f.isDir, size: f.size })),
        };
      },
    }),

    mouseClick: tool({
      description: "Click at a point on the screen, on the 0–1000 grid.",
      inputSchema: z.object({
        ...point,
        button: z.enum(["left", "right", "middle"]).default("left"),
        double: z.boolean().default(false),
      }),
      execute: async ({ x, y, button, double }) => {
        const { cu, px } = await desktop();
        await cu.mouse.click(...px(x, y), button, double);
        return { x, y, button, double };
      },
    }),

    mouseMove: tool({
      description: "Move the pointer to a point on the screen (0–1000 grid), e.g. to hover.",
      inputSchema: z.object(point),
      execute: async ({ x, y }) => {
        const { cu, px } = await desktop();
        await cu.mouse.move(...px(x, y));
        return { x, y };
      },
    }),

    mouseDrag: tool({
      description:
        "Press at one point, drag to another and release (0–1000 grid), e.g. to select text or move a window.",
      inputSchema: z.object({
        fromX: point.x,
        fromY: point.y,
        toX: point.x,
        toY: point.y,
      }),
      execute: async ({ fromX, fromY, toX, toY }) => {
        const { cu, px } = await desktop();
        await cu.mouse.drag(...px(fromX, fromY), ...px(toX, toY));
        return { fromX, fromY, toX, toY };
      },
    }),

    mouseScroll: tool({
      description: "Scroll the wheel with the pointer at a point (0–1000 grid). One tick moves a few lines.",
      inputSchema: z.object({
        ...point,
        direction: z.enum(["up", "down", "left", "right"]),
        amount: z.number().int().min(1).max(30).default(3).describe("Wheel ticks."),
      }),
      execute: async ({ x, y, direction, amount }) => {
        const { cu, px } = await desktop();
        await cu.mouse.scroll(...px(x, y), direction, amount);
        return { x, y, direction, amount };
      },
    }),

    keyboardType: tool({
      description: "Type text into whatever has focus. Newlines press Enter; tabs aren't allowed.",
      inputSchema: z.object({ text: z.string().min(1) }),
      execute: async ({ text }) => {
        await (await desktop()).cu.keyboard.type(text);
        return { typed: text.length };
      },
    }),

    keyboardPress: tool({
      description:
        "Press one key, optionally with modifiers. Keys: enter, escape, tab, backspace, delete, space, up/down/left/right, home, end, pageup, pagedown, f1–f24, letters, digits.",
      inputSchema: z.object({
        key: z.string().min(1),
        modifiers: z.array(z.enum(["ctrl", "alt", "shift", "cmd"])).default([]),
      }),
      execute: async ({ key, modifiers }) => {
        await (await desktop()).cu.keyboard.press(key, modifiers);
        return { key, modifiers };
      },
    }),

    viewScreen: tool({
      description:
        "Look at your screen yourself. Use before clicking and after actions to check what happened. The user doesn't see this.",
      inputSchema: z.object({}),
      execute: async () => screenshot(await sandbox()),
      toModelOutput: screenshotForModel,
    }),

    showScreen: tool({
      description:
        "Show the user your screen, in the chat. Use only when they ask to see it or what's on it.",
      inputSchema: z.object({}),
      execute: async () => screenshot(await sandbox()),
      toModelOutput: screenshotForModel,
    }),
  };
}

export type SandboxTools = ReturnType<typeof createSandboxTools>;
/** In a group chat, a user message records which bot it was sent to. */
export type ChatMessageMetadata = { botId?: string };
export type ChatUIMessage = UIMessage<
  ChatMessageMetadata,
  UIDataTypes,
  InferUITools<SandboxTools & { handoff: HandoffTool }>
>;
