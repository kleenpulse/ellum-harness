"use client";

import { useUser } from "@clerk/nextjs";
import { LayoutGrid, Monitor, Moon, RotateCcw, Rows3, Sun } from "lucide-react";
import { useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useState, useSyncExternalStore, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Segmented, type SegmentedOption } from "@/components/ui/segmented";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import { type BotsView, saveBotsView } from "@/lib/bots/view";
import { type MotionPref, readMotion, subscribeMotion, writeMotion } from "@/lib/motion-pref";
import { railLock, readRail, subscribeRail, writeRail } from "@/lib/shell/rail-store";
import { runThemeTransition } from "@/lib/theme-transition";
import { hasAvatarSeed, saveAvatarSeed } from "./avatar-seed";
import { SettingList, SettingRow } from "./setting-row";

type Theme = "system" | "light" | "dark";

const THEMES: SegmentedOption<Theme>[] = [
  { value: "system", label: "System", icon: Monitor },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
];

const MOTIONS: SegmentedOption<MotionPref>[] = [
  { value: "system", label: "System" },
  { value: "reduce", label: "Reduced" },
];

const VIEWS: SegmentedOption<BotsView>[] = [
  { value: "list", label: "List", icon: Rows3 },
  { value: "cards", label: "Cards", icon: LayoutGrid },
];

const noop = () => () => {};
const isTheme = (value: string | undefined): value is Theme =>
  value === "system" || value === "light" || value === "dark";

/**
 * Every look-and-feel preference, each wired to the store the rest of the app
 * reads: next-themes, the motion and rail stores, the Bots view cookie.
 */
export function Appearance({
  initialRail,
  initialBotsView,
}: {
  /** From the cookies, so the first paint matches what the server knows. */
  initialRail: boolean;
  initialBotsView: BotsView;
}) {
  const router = useRouter();
  const { user } = useUser();
  const { theme, resolvedTheme, setTheme } = useTheme();
  // The theme lives in localStorage: unknown until the browser has hydrated.
  const hydrated = useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
  const motion = useSyncExternalStore(subscribeMotion, readMotion, () => "system" as const);
  const osReduced = useReducedMotion();
  const railOpen = useSyncExternalStore(subscribeRail, readRail, () => initialRail);
  const [botsView, setBotsView] = useState(initialBotsView);
  const [resetting, startReset] = useTransition();

  function pickTheme(next: Theme, element?: HTMLElement) {
    const dark =
      next === "system" ? window.matchMedia("(prefers-color-scheme: dark)").matches : next === "dark";
    const applyTheme = () => {
      setTheme(next);
      // next-themes sets the class in an effect, after the snapshot; set it now.
      document.documentElement.classList.toggle("dark", dark);
    };
    // Light to System on a light device changes nothing on screen: no reveal to play.
    if (dark === (resolvedTheme === "dark")) applyTheme();
    else runThemeTransition({ triggerEl: element, applyTheme });
  }

  function pickRail(open: boolean) {
    const lock = railLock();
    if (lock) {
      toast.add({ type: "info", title: "The sidebar stays collapsed here", description: lock });
      return;
    }
    writeRail(open);
  }

  function pickBotsView(next: BotsView) {
    setBotsView(next);
    saveBotsView(next);
    // Drops any copy of /bots the router still holds in the old layout.
    router.refresh();
  }

  function reset() {
    // Outside the transition: these apply at once, not after the avatar saves.
    pickTheme("system");
    writeMotion("system");
    pickRail(false);
    setBotsView("list");
    saveBotsView("list");
    startReset(async () => {
      let avatarKept = false;
      if (user && hasAvatarSeed(user)) {
        try {
          await saveAvatarSeed(user, null);
        } catch (error) {
          console.error("Couldn't reset the avatar", error);
          avatarKept = true;
        }
      }
      router.refresh();
      toast.add(
        avatarKept
          ? {
              type: "error",
              title: "Mostly reset",
              description: "Your preferred avatar couldn't be cleared. Try again from the Avatar card.",
            }
          : { type: "success", title: "Settings are back to their defaults" },
      );
    });
  }

  return (
    <SettingList>
      <SettingRow title="Theme" help="System follows your device, including its day and night switch.">
        <Segmented
          label="Theme"
          options={THEMES}
          value={hydrated && isTheme(theme) ? theme : undefined}
          onChange={pickTheme}
          disabled={resetting}
        />
      </SettingRow>

      <SettingRow
        title="Motion"
        help={
          osReduced
            ? "Your device already asks for reduced motion, so it stays reduced either way."
            : "Reduced cuts slides, springs and the theme reveal. System follows your device."
        }
      >
        <Segmented label="Motion" options={MOTIONS} value={motion} onChange={writeMotion} disabled={resetting} />
      </SettingRow>

      {/* No rail below md: the tab bar takes over, so there is nothing to keep open. */}
      <SettingRow
        className="hidden md:flex"
        title="Side rail"
        help={
          <>
            Keep the rail open, with names beside the icons.{" "}
            <kbd className="font-mono text-[11px] text-ink">[</kbd> toggles it from anywhere.
          </>
        }
      >
        <Switch
          aria-label="Keep the side rail open"
          checked={railOpen}
          onCheckedChange={pickRail}
          disabled={resetting}
        />
      </SettingRow>

      <SettingRow title="Bots layout" help="How the Bots page lists your bots.">
        <Segmented
          label="Bots layout"
          options={VIEWS}
          value={botsView}
          onChange={pickBotsView}
          disabled={resetting}
        />
      </SettingRow>

      <SettingRow
        title="Reset to defaults"
        help="Theme, motion, side rail and Bots layout go back to how they started, and your avatar to a new face every visit."
      >
        <Button size="pill-sm" variant="surface" disabled={resetting} onClick={reset}>
          {resetting ? <Spinner data-icon="inline-start" /> : <RotateCcw data-icon="inline-start" />}
          Reset
        </Button>
      </SettingRow>
    </SettingList>
  );
}
