import { Daytona, DaytonaNotFoundError, type Sandbox } from "@daytona/sdk";

let client: Daytona | undefined;

// Built on first use so a missing key fails the request, not the build.
// Config is passed explicitly: Next loads .env.local into process.env, and the
// SDK refuses an endpoint it finds in both places unless the caller names it.
function daytona() {
  client ??= new Daytona({
    apiKey: process.env.DAYTONA_API_KEY,
    apiUrl: process.env.DAYTONA_API_URL,
  });
  return client;
}

/** The bot's long-term notes; the system prompt tells it when to read and write them. */
export const MEMORY_PATH = "/home/daytona/MEMORY.md";

/** Creates the bot's sandbox with a blank MEMORY.md and returns its id. Labels tie it back to the bot for orphan sweeps. */
export async function createBotSandbox(botId: string, userId: string): Promise<string> {
  const sandbox = await daytona().create({ labels: { app: "ellum", botId, userId } });
  try {
    const { exitCode, result } = await sandbox.process.executeCommand(`touch ${MEMORY_PATH}`);
    if (exitCode !== 0) throw new Error(`Couldn't create ${MEMORY_PATH}: ${result}`);
  } catch (error) {
    // The caller never learns this id, so nothing else would delete it.
    await daytona().delete(sandbox).catch((cleanup) => console.error("Sandbox cleanup failed", cleanup));
    throw error;
  }
  return sandbox.id;
}

/** MEMORY.md's text, or undefined if it couldn't be read (sandbox down, file deleted). */
export async function readMemory(sandboxId: string): Promise<string | undefined> {
  try {
    const sandbox = await getRunningSandbox(sandboxId);
    return (await sandbox.fs.downloadFile(MEMORY_PATH)).toString("utf8");
  } catch (error) {
    console.warn("Couldn't read the bot's memory", error);
    return undefined;
  }
}

/** Deletes a sandbox; one that is already gone counts as deleted. */
export async function deleteSandbox(sandboxId: string): Promise<void> {
  try {
    const sandbox = await daytona().get(sandboxId);
    await daytona().delete(sandbox);
  } catch (error) {
    if (error instanceof DaytonaNotFoundError) return;
    throw error;
  }
}

/**
 * Deletes every sandbox labelled as this user's, including any a failed
 * deletion stranded earlier. Returns how many could not be removed.
 */
export async function deleteUserSandboxes(userId: string): Promise<number> {
  const sandboxes: Sandbox[] = [];
  for await (const sandbox of daytona().list({ labels: { app: "ellum", userId } })) sandboxes.push(sandbox);
  const results = await Promise.allSettled(sandboxes.map((sandbox) => daytona().delete(sandbox)));
  let failed = 0;
  for (const result of results) {
    if (result.status === "fulfilled" || result.reason instanceof DaytonaNotFoundError) continue;
    failed += 1;
    console.error("Sandbox deletion failed", result.reason);
  }
  return failed;
}

/** The sandbox, started if it auto-stopped while idle. */
export async function getRunningSandbox(sandboxId: string): Promise<Sandbox> {
  const sandbox = await daytona().get(sandboxId);
  if (sandbox.state !== "started") await sandbox.start();
  return sandbox;
}

export type SandboxState = NonNullable<Sandbox["state"]>;

/** Every sandbox of the user's bots and its state right now. Read-only: never wakes one. */
export async function listSandboxStates(userId: string): Promise<Map<string, SandboxState>> {
  const states = new Map<string, SandboxState>();
  for await (const sandbox of daytona().list({ labels: { app: "ellum", userId } })) {
    states.set(sandbox.id, sandbox.state ?? "unknown");
  }
  return states;
}

/** Starts the desktop (Xvfb, xfce4, VNC) unless it's already up. Takes ~10s cold. */
export async function ensureDesktop(sandbox: Sandbox): Promise<void> {
  const { status } = await sandbox.computerUse.getStatus();
  if (status !== "active") await sandbox.computerUse.start();
}
