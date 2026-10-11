"use client";

import { Maximize2, Monitor } from "lucide-react";
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
  type RefCallback,
} from "react";
import { usePanelRef } from "react-resizable-panels";
import { openDesktop } from "@/actions/desktop";
import { Button } from "@/components/ui/button";
import GrowDialog from "@/components/ui/grow-dialog";
import { ResizableHandle, ResizablePanel } from "@/components/ui/resizable";
import { Spinner } from "@/components/ui/spinner";
import { lockRail } from "@/lib/shell/rail-store";

type Slot = "panel" | "dialog";

// Daytona's preview warning (shown in the frame before noVNC) fits without
// scrollbars from a 560px-wide frame on a 768px-tall screen; + the panel's p-4.
const LG_MIN_PX = 560 + 32;
const LG_QUERY = "(min-width: 64rem)";

function subscribeLg(onChange: () => void) {
  const query = window.matchMedia(LG_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}
const readLg = () => window.matchMedia(LG_QUERY).matches;

type DesktopPanelState = {
  panelRef: ReturnType<typeof usePanelRef>;
  open: boolean;
  setOpen: (open: boolean) => void;
  frame: { loading: boolean; ready: boolean; error: string | null; retry: () => void };
  panelHostRef: RefCallback<HTMLDivElement>;
  dialogHostRef: RefCallback<HTMLDivElement>;
};

const DesktopPanelContext = createContext<DesktopPanelState | null>(null);

function useDesktopPanel() {
  const state = use(DesktopPanelContext);
  if (!state) throw new Error("Desktop panel parts must sit inside DesktopPanelProvider.");
  return state;
}

// Chrome 133+, Firefox 144+: moves a node without unloading it. Not in TS's DOM lib yet.
type MoveBefore = { moveBefore?: (node: Node, child: Node | null) => void };

/** Re-parents the iframe. moveBefore keeps the VNC session alive; appendChild would reload it. */
function move(frame: HTMLIFrameElement, target: HTMLElement) {
  if (frame.parentElement === target) return;
  const parent = target as HTMLElement & MoveBefore;
  if (frame.isConnected && parent.moveBefore) parent.moveBefore(frame, null);
  else target.appendChild(frame);
}

/**
 * Owns the bot's one VNC iframe. It's built imperatively, outside React, and
 * moved between the panel and the fullscreen dialog, so the session connects
 * once and survives every open and close.
 */
export function DesktopPanelProvider({ chatId, children }: { chatId: string; children: React.ReactNode }) {
  const panelRef = usePanelRef();
  const [open, setOpenState] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, startLoading] = useTransition();
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  // A ref, not the transition flag: onResize can fire again before `loading` re-renders.
  const requested = useRef(false);
  const slots = useRef<Record<Slot, HTMLDivElement | null>>({ panel: null, dialog: null });

  // The panel needs the width: the rail stays collapsed while it's open.
  useEffect(() => {
    lockRail(open ? "Close the desktop panel to expand it again." : null);
    return () => lockRail(null);
  }, [open]);

  // The dialog wins while it's mounted; it hands the frame back as it unmounts.
  const place = useCallback(() => {
    const frame = frameRef.current;
    const target = slots.current.dialog ?? slots.current.panel;
    if (!frame || !target) return;
    move(frame, target);
    // In the panel it's a view-only preview under a click target, so keep it out of the tab order.
    frame.tabIndex = target === slots.current.dialog ? 0 : -1;
  }, []);

  const load = useCallback(() => {
    requested.current = true;
    setError(null);
    startLoading(async () => {
      const result = await openDesktop(chatId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const frame = document.createElement("iframe");
      frame.src = result.url;
      frame.title = "Bot desktop";
      frame.allow = "clipboard-read; clipboard-write";
      frame.className = "block size-full border-0";
      frame.addEventListener("load", () => setReady(true), { once: true });
      frameRef.current = frame;
      place();
    });
  }, [chatId, place]);

  // Loads on first open, by button or by drag, and never again (a failure waits for Retry).
  const setOpen = useCallback(
    (next: boolean) => {
      setOpenState(next);
      if (next && !requested.current) load();
    },
    [load],
  );

  const attach = useCallback(
    (slot: Slot, el: HTMLDivElement) => {
      slots.current[slot] = el;
      place();
      if (slot === "dialog") {
        // After the dialog's own focus bookkeeping, so closing still returns focus to the preview.
        setTimeout(() => frameRef.current?.focus(), 0);
      }
      // React runs ref cleanup before removing the node, so the frame leaves the dialog before the dialog leaves the DOM.
      return () => {
        slots.current[slot] = null;
        place();
      };
    },
    [place],
  );
  const panelHostRef = useCallback((el: HTMLDivElement) => attach("panel", el), [attach]);
  const dialogHostRef = useCallback((el: HTMLDivElement) => attach("dialog", el), [attach]);
  const frame = { loading, ready, error, retry: load };

  return (
    <DesktopPanelContext value={{ panelRef, open, setOpen, frame, panelHostRef, dialogHostRef }}>
      {children}
    </DesktopPanelContext>
  );
}

export function DesktopPanelToggle() {
  const { panelRef, open } = useDesktopPanel();
  return (
    <Button
      // The surface pill marks the panel as open; closed, it's a bare icon.
      variant={open ? "surface" : "ghost"}
      size="circle"
      aria-label="Desktop"
      aria-pressed={open}
      onClick={() => (open ? panelRef.current?.collapse() : panelRef.current?.expand())}
    >
      <Monitor strokeWidth={1.75} />
    </Button>
  );
}

/** Hidden while collapsed, so a closed panel leaves no seam on the viewport edge. */
export function DesktopPanelHandle() {
  const { open } = useDesktopPanel();
  return <ResizableHandle disabled={!open} className={open ? undefined : "hidden"} />;
}

export function DesktopPanel({ botName }: { botName: string }) {
  const { panelRef, setOpen, frame, panelHostRef } = useDesktopPanel();
  const lg = useSyncExternalStore(subscribeLg, readLg, () => false);
  const [fullscreen, setFullscreen] = useState(false);
  const [origin, setOrigin] = useState<{ rect: DOMRect; width: number } | null>(null);

  return (
    <ResizablePanel
      id="desktop"
      panelRef={panelRef}
      collapsible
      collapsedSize={0}
      defaultSize={0}
      minSize={lg ? LG_MIN_PX : "30"}
      maxSize="70"
      // Dragging past the threshold collapses it too, so state follows the panel, not the button.
      onResize={(size) => setOpen(size.asPercentage > 0)}
      className="flex flex-col p-4"
    >
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-well bg-card-nested ring-1 ring-border dark:ring-glass-border">
        <div ref={panelHostRef} className="absolute inset-0" />
        {frame.ready && (
          <button
            type="button"
            aria-label={`Open ${botName}'s desktop fullscreen`}
            onClick={(event) => {
              setOrigin({ rect: event.currentTarget.getBoundingClientRect(), width: window.innerWidth - 32 });
              setFullscreen(true);
            }}
            className="group absolute inset-0 flex cursor-zoom-in items-end justify-end p-3 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
          >
            <span className="flex size-9 items-center justify-center rounded-pill bg-background/80 text-ink-2 opacity-0 shadow-lift backdrop-blur-xs transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
              <Maximize2 className="size-4" strokeWidth={1.75} />
            </span>
          </button>
        )}
        {!frame.ready && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-[13px] text-ink-2">
            {frame.error ? (
              <>
                <p>{frame.error}</p>
                <Button size="pill-sm" variant="surface" onClick={frame.retry}>
                  Retry
                </Button>
              </>
            ) : (
              <>
                <Spinner />
                <p>Starting {botName}&apos;s desktop…</p>
              </>
            )}
          </div>
        )}
      </div>
      <GrowDialog
        open={fullscreen}
        onOpenChange={setFullscreen}
        title={`${botName}'s desktop`}
        originRect={origin?.rect}
        originMaxWidth={origin?.width}
        // Keystrokes and clicks belong to the desktop; only the close button closes.
        dismissible={false}
        autoFocus={false}
        className="h-[calc(100svh-2rem)] max-h-none w-[calc(100vw-2rem)] max-w-none"
      >
        <DialogHost />
      </GrowDialog>
    </ResizablePanel>
  );
}

/** Where the frame lives while the dialog is open; mounts and unmounts with the dialog's content. */
function DialogHost() {
  const { dialogHostRef } = useDesktopPanel();
  return (
    <div
      ref={dialogHostRef}
      className="mx-5 mb-5 min-h-0 flex-1 overflow-hidden rounded-well bg-card-nested ring-1 ring-border dark:ring-glass-border"
    />
  );
}
