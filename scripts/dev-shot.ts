/**
 * Screenshot any route, protected ones included, as a real signed-in dev user.
 *
 *   bun run shot                      # / and /bots, light + dark, desktop + mobile
 *   bun run shot . bots --base http://localhost:3000 --out .shots
 *
 *   bun run shot . --pointer 1200,120 # park the cursor first (hover / pointer-follow states)
 *   bun run shot . --cookie ellum-rail=open # preset a cookie (e.g. the expanded rail)
 *   bun run shot . --press Control+k # press a key before the shot (e.g. open the palette)
 *
 * Routes go without the leading slash ("." is home): Git Bash rewrites "/x"
 * arguments into Windows paths.
 *
 * Auth is never bypassed: @clerk/testing mints a sign-in token for a dev user
 * (created on first run) and Clerk signs the browser in for real. Refuses to
 * run against anything but a development Clerk instance on localhost.
 */
import { createClerkClient } from "@clerk/backend";
import { clerk, clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const EMAIL = process.env.DEV_AGENT_EMAIL ?? "agent+clerk_test@example.com";

const args = process.argv.slice(2);
const flag = (name: string, fallback: string) => {
  const i = args.indexOf(name);
  return i === -1 ? fallback : args.splice(i, 2)[1];
};
const base = flag("--base", "http://localhost:3000");
const out = flag("--out", ".shots");
const pointer = flag("--pointer", "").split(",").map(Number);
const cookie = flag("--cookie", "");
const press = flag("--press", "");
const routes = (args.length ? args : [".", "bots"]).map((r) =>
  r === "." ? "/" : `/${r.replace(/^\/+/, "")}`,
);

const secretKey = process.env.CLERK_SECRET_KEY ?? "";
if (!secretKey.startsWith("sk_test_")) throw new Error("dev-shot: needs a development CLERK_SECRET_KEY (sk_test_…)");
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(base)) throw new Error(`dev-shot: refusing non-local base ${base}`);

// Ticket sign-in needs the user to exist; +clerk_test addresses skip verification.
const backend = createClerkClient({ secretKey });
const { data: found } = await backend.users.getUserList({ emailAddress: [EMAIL] });
if (!found.length) {
  await backend.users.createUser({ emailAddress: [EMAIL], firstName: "Agent", skipPasswordRequirement: true });
  console.log(`dev-shot: created dev user ${EMAIL}`);
}

await clerkSetup({ publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, secretKey });
mkdirSync(out, { recursive: true });

// installed Chrome: no Playwright browser download needed
const browser = await chromium.launch({ channel: process.env.SHOT_CHANNEL ?? "chrome" });
const viewports = { desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } };

for (const theme of ["light", "dark"] as const) {
  for (const [device, viewport] of Object.entries(viewports)) {
    const context = await browser.newContext({ viewport, colorScheme: theme, deviceScaleFactor: 1 });
    // next-themes reads its choice from localStorage before paint
    await context.addInitScript((t) => localStorage.setItem("theme", t), theme);
    if (cookie) {
      const [name, ...value] = cookie.split("=");
      await context.addCookies([{ name, value: value.join("="), url: base }]);
    }
    const page = await context.newPage();
    page.on("console", (m) => m.type() === "error" && console.log(`  [console] ${m.text()}`));

    await setupClerkTestingToken({ page });
    await page.goto(`${base}/sign-in`);
    await clerk.loaded({ page });
    await clerk.signIn({ page, emailAddress: EMAIL });

    for (const route of routes) {
      await page.goto(`${base}${route}`, { waitUntil: "networkidle" });
      if (pointer.length === 2 && device === "desktop") await page.mouse.move(pointer[0], pointer[1], { steps: 8 });
      await page.waitForTimeout(700); // entrance stagger and springs settle
      if (press) {
        await page.keyboard.press(press);
        await page.waitForTimeout(400);
      }
      const file = join(out, `${route === "/" ? "home" : route.replace(/^\/|\/$/g, "").replace(/\//g, "_")}-${theme}-${device}.png`);
      await page.screenshot({ path: file, fullPage: true });
      console.log(file);
    }
    await context.close();
  }
}

await browser.close();
