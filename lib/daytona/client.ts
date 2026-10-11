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

/** Creates the bot's sandbox and returns its id. Labels tie it back to the bot for orphan sweeps. */
export async function createBotSandbox(botId: string, userId: string): Promise<string> {
  const sandbox = await daytona().create({ labels: { app: "ellum", botId, userId } });
  return sandbox.id;
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

/** The sandbox, started if it auto-stopped while idle. */
export async function getRunningSandbox(sandboxId: string): Promise<Sandbox> {
  const sandbox = await daytona().get(sandboxId);
  if (sandbox.state !== "started") await sandbox.start();
  return sandbox;
}

/** Starts the desktop (Xvfb, xfce4, VNC) unless it's already up. Takes ~10s cold. */
export async function ensureDesktop(sandbox: Sandbox): Promise<void> {
  const { status } = await sandbox.computerUse.getStatus();
  if (status !== "active") await sandbox.computerUse.start();
}
