"use client";

import {
	useEffect,
	useRef,
	useState,
	useSyncExternalStore,
	type ComponentType,
	type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Command } from "cmdk";
import { AnimatePresence, motion } from "motion/react";
import AutoMaskVertical from "@/components/ui/auto-mask-vertical";
import { cn } from "@/lib/utils";

// Source: shadow-garden components/registry/command-palette, restyled onto
// Ellum tokens. Additions: `media` (a rendered leading visual, e.g. an avatar),
// items keyed by id so equal labels never collide, and the fixed palette
// portals to <body> so no ancestor's stacking context or overflow clips it.

const noop = () => () => {};

export type CommandDef = {
	id: string;
	label: string;
	icon?: ComponentType<{ className?: string }>;
	/** A rendered leading visual (avatar, swatch). Takes precedence over `icon`. */
	media?: ReactNode;
	keywords?: string[];
	hint?: string;
	/**
	 * "You are here" — the command whose destination is already open. Drawn as a
	 * persistent signal mark, deliberately separate from cmdk's selection: that
	 * one is a cursor and the pointer steals it on hover, so it cannot double as
	 * a location marker.
	 */
	active?: boolean;
	onRun?: () => void;
};

export interface CommandGroupDef {
	id: string;
	heading: string;
	commands: CommandDef[];
	/**
	 * Pin this group to an always-visible footer bar instead of the scrolling
	 * list. Pinned commands survive search filtering (cmdk `forceMount`) and drop
	 * their heading — meant for a small set of standing actions.
	 */
	pinned?: boolean;
}

export type Hotkey = "cmd+k" | "ctrl+k" | "/";

export interface CommandPaletteProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	groups: CommandGroupDef[];
	onSelect?: (command: CommandDef) => void;
	/** Fires as the search query changes (each keystroke). */
	onValueChange?: (search: string) => void;
	/** Fires when a command is highlighted via pointer hover. */
	onItemHover?: (command: CommandDef) => void;
	/** One hotkey, or several bound at once (e.g. ["cmd+k", "/"]). */
	hotkey?: Hotkey | Hotkey[];
	loop?: boolean;
	/** Liquid-glass surface vs. a solid panel. */
	glass?: boolean;
	placeholder?: string;
	/**
	 * Position as a viewport-fixed overlay instead of filling the nearest
	 * positioned ancestor. Default (false) keeps the preview scoped to its frame;
	 * the app shell passes true to use the palette as global chrome.
	 */
	fixed?: boolean;
	/**
	 * Value (an item's id) to highlight when the palette opens. `undefined`
	 * keeps cmdk's default (auto-select the first item — used by the standalone
	 * demo); `null` highlights nothing; a string highlights that item.
	 */
	initialValue?: string | null;
}

// Non-empty sentinel that matches no item id, so cmdk highlights nothing.
// Must be non-empty: an empty root value makes cmdk auto-select the first item.
const NO_SELECTION = "__none__";

export function isMacPlatform(): boolean {
	return /mac/i.test(navigator.platform || navigator.userAgent);
}

export function isEditableTarget(): boolean {
	const el = document.activeElement as HTMLElement | null;
	if (!el) return false;
	const tag = el.tagName;
	return (
		tag === "INPUT" ||
		tag === "TEXTAREA" ||
		tag === "SELECT" ||
		el.isContentEditable
	);
}

function matchesHotkey(event: KeyboardEvent, hotkey: Hotkey): boolean {
	if (hotkey === "/") {
		// Never hijack "/" while a field is focused (sidebar search, the palette's
		// own input, …) — let it type normally.
		if (isEditableTarget()) return false;
		return event.key === "/";
	}
	// "cmd+k" falls back to Ctrl on non-Apple platforms (⌘ has no equivalent
	// there), so the default binding works everywhere. "ctrl+k" stays strict.
	const mod =
		hotkey === "cmd+k"
			? event.metaKey || (!isMacPlatform() && event.ctrlKey)
			: event.ctrlKey;
	return mod && event.key.toLowerCase() === "k";
}

export default function CommandPalette({
	open,
	onOpenChange,
	groups,
	onSelect,
	onValueChange,
	onItemHover,
	hotkey = "cmd+k",
	loop = true,
	glass = false,
	placeholder = "Type a command or search…",
	fixed = false,
	initialValue,
}: CommandPaletteProps) {
	// Controlled highlight: left uncontrolled, cmdk auto-selects the first item,
	// ignoring the current route. Seed the selection from the caller each time
	// the palette opens instead.
	const [value, setValue] = useState("");
	// Seed synchronously *during render* on the open transition (React's
	// adjust-state-on-prop-change pattern), not in an effect: cmdk runs its
	// auto-select-first pass when items mount, before an effect fires. Seeding
	// now means the root mounts already seeded, so that pass is skipped.
	// undefined → "" leaves cmdk's default.
	const [wasOpen, setWasOpen] = useState(open);
	if (open !== wasOpen) {
		setWasOpen(open);
		if (open) {
			setValue(initialValue === undefined ? "" : (initialValue ?? NO_SELECTION));
		}
	}
	const mounted = useSyncExternalStore(noop, () => true, () => false);
	// Normalize to a stable string so a fresh array literal each render doesn't
	// churn the listener subscription.
	const hotkeyKey = Array.isArray(hotkey) ? hotkey.join(",") : hotkey;
	useEffect(() => {
		// Empty hotkey list → bind no opener (an instance can "stand down" from the
		// global hotkey), but keep Escape-to-close either way.
		const hotkeys = hotkeyKey ? (hotkeyKey.split(",") as Hotkey[]) : [];
		const onKey = (event: KeyboardEvent) => {
			if (hotkeys.length && hotkeys.some((h) => matchesHotkey(event, h))) {
				event.preventDefault();
				onOpenChange(!open);
			} else if (event.key === "Escape" && open) {
				onOpenChange(false);
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [open, hotkeyKey, onOpenChange]);

	// While the fixed (shell) palette is open it covers the viewport, so freeze
	// page scroll underneath it. The scoped preview instance (fixed=false) lives
	// inside its own frame and must leave the page alone.
	useEffect(() => {
		if (!fixed || !open) return;
		const { body, documentElement } = document;
		const scrollbarWidth = window.innerWidth - documentElement.clientWidth;
		const prevOverflow = body.style.overflow;
		const prevPaddingRight = body.style.paddingRight;
		body.style.overflow = "hidden";
		// Pad by the reclaimed scrollbar width so hiding it doesn't reflow the page.
		if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;
		return () => {
			body.style.overflow = prevOverflow;
			body.style.paddingRight = prevPaddingRight;
		};
	}, [fixed, open]);

	const runCommand = (command: CommandDef) => {
		onSelect?.(command);
		command.onRun?.();
		onOpenChange(false);
	};

	const renderItem = (
		command: CommandDef,
		pinned = false,
		lastPinned = false,
	) => {
		const Icon = command.icon;
		const iconTone = command.active ? "text-signal-ink" : "text-ink-3";
		// The active row keeps signal text in every state, so it stays legible as
		// "where you are" even while the cursor sits on it. A normal row only turns
		// bright under the cursor. Both keep the same selected background — the
		// two marks stack instead of replacing one another.
		const tone = command.active
			? "text-signal-ink before:absolute before:top-1/2 before:left-0 before:h-4 before:w-0.5 before:-translate-y-1/2 before:rounded-full before:bg-signal"
			: "text-ink-2 data-[selected=true]:text-ink";
		return (
			<Command.Item
				key={command.id}
				value={command.id}
				// The id is the value (unique); the label is what search matches.
				keywords={[command.label, ...(command.keywords ?? [])]}
				onSelect={() => runCommand(command)}
				onMouseEnter={() => onItemHover?.(command)}
				forceMount={pinned || undefined}
				className={cn(
					"relative flex cursor-pointer items-center font-sans data-[selected=true]:bg-accent",
					pinned
						? // Pinned items grow to fill the footer row. Earlier items refuse to
							// shrink so that only the last one truncates when space runs out.
							cn(
								"grow gap-1.5 rounded-full px-2.5 py-1.5 text-xs",
								lastPinned ? "min-w-0" : "shrink-0",
							)
						: "gap-2.5 rounded-xl px-2.5 py-2 text-[13.5px]",
					tone,
				)}
			>
				{command.media ??
					(Icon && (
						<Icon
							className={cn(pinned ? "size-3.5 shrink-0" : "size-4", iconTone)}
						/>
					))}
				<span
					className={
						pinned
							? lastPinned
								? "min-w-0 truncate"
								: "whitespace-nowrap"
							: "min-w-0 flex-1 truncate"
					}
				>
					{command.label}
				</span>
				{command.hint && (
					// Split on whitespace so a chord ("G C", "⌘ C") reads as one chip per
					// key instead of overflowing a single fixed-size box.
					<span className="flex shrink-0 items-center gap-1">
						{command.hint.split(/\s+/).map((key, index) => (
							<kbd
								key={`${key}-${index}`}
								className={cn(
									"inline-flex h-5 min-w-5 items-center justify-center rounded border border-border px-1 font-mono text-[10px] leading-none dark:border-glass-border",
									pinned ? "text-current" : "text-ink-3",
								)}
							>
								{key}
							</kbd>
						))}
					</span>
				)}
			</Command.Item>
		);
	};

	const scrollGroups = groups.filter((group) => !group.pinned);
	const pinnedGroups = groups.filter((group) => group.pinned);

	// Typing re-filters the list; snap the scroll region back to the top so the
	// best matches aren't hidden below a stale scroll offset.
	const listRef = useRef<HTMLDivElement>(null);

	// A seeded selection can sit far below the fold. cmdk scrolls it in on mount,
	// but only `block: "nearest"` — the row lands flush against an edge with no
	// neighbours visible. Re-center it. Deferred a macrotask: cmdk only marks the
	// row `aria-selected` on a later commit (item registration → store emit →
	// re-render), so an effect running on the open commit would find nothing
	// selected yet.
	useEffect(() => {
		if (!open || !initialValue) return;
		const timer = setTimeout(() => {
			listRef.current
				?.querySelector('[aria-selected="true"]')
				?.scrollIntoView({ block: "center" });
		}, 0);
		return () => clearTimeout(timer);
	}, [open, initialValue]);

	const surface = glass
		? "glass border-glass-border"
		: "dialog-surface border-border dark:border-glass-border";

	const palette = (
		<AnimatePresence>
			{open && (
				<motion.div
					className={cn(
						fixed ? "fixed" : "absolute",
						"inset-0 z-50 flex items-start justify-center px-4 pt-[12%]",
					)}
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					transition={{ duration: 0.15 }}
				>
					<button
						aria-label="Close command palette"
						onClick={() => onOpenChange(false)}
						className="absolute inset-0 bg-background/60 backdrop-blur-xs"
					/>
					<motion.div
						initial={{ opacity: 0, scale: 0.97, y: -8 }}
						animate={{ opacity: 1, scale: 1, y: 0 }}
						exit={{ opacity: 0, scale: 0.97, y: -8 }}
						transition={{ duration: 0.16, ease: "easeOut" }}
						role="dialog"
						aria-modal="true"
						aria-label="Command palette"
						className={cn(
							"relative z-10 w-full max-w-xl overflow-hidden rounded-[22px] border shadow-lift",
							surface,
						)}
					>
						<Command
							value={value}
							onValueChange={setValue}
							// cmdk keeps the last pointer-hovered item selected (it doubles as
							// the keyboard-active row), so the highlight lingers after the cursor
							// leaves. Clear it on exit — arrow keys re-enter from the top.
							onMouseLeave={() => setValue(NO_SELECTION)}
							loop={loop}
							className="relative"
						>
							<div className="border-b border-border px-4 dark:border-glass-border">
								<Command.Input
									autoFocus
									placeholder={placeholder}
									onValueChange={(value) => {
										onValueChange?.(value);
										listRef.current?.scrollTo({ top: 0 });
									}}
									className="h-12 w-full bg-transparent font-sans text-sm text-ink outline-none placeholder:text-ink-3"
								/>
							</div>
							<AutoMaskVertical ref={listRef} className="max-h-80">
								<Command.List className="overflow-y-visible p-2">
									<Command.Empty className="px-3 py-6 text-center font-mono text-xs text-ink-3">
										No results.
									</Command.Empty>
									{scrollGroups.map((group) => (
										<Command.Group
											key={group.id}
											heading={group.heading}
											className="**:[[cmdk-group-heading]]:readout **:[[cmdk-group-heading]]:px-2.5 **:[[cmdk-group-heading]]:py-1.5"
										>
											{group.commands.map((command) => renderItem(command))}
										</Command.Group>
									))}
								</Command.List>
							</AutoMaskVertical>
							{pinnedGroups.length > 0 && (
								<div className="flex w-full items-center gap-1 overflow-hidden border-t border-border p-2 dark:border-glass-border">
									{/* `contents` erases the group wrappers from layout so every
									    pinned item across all groups shares one flex row. */}
									{pinnedGroups.map((group, groupIndex) => (
										<Command.Group
											key={group.id}
											forceMount
											className="contents [&_[cmdk-group-items]]:contents"
										>
											{group.commands.map((command, commandIndex) =>
												renderItem(
													command,
													true,
													groupIndex === pinnedGroups.length - 1 &&
														commandIndex === group.commands.length - 1,
												),
											)}
										</Command.Group>
									))}
								</div>
							)}
						</Command>
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
	);

	if (!fixed) return palette;
	return mounted ? createPortal(palette, document.body) : null;
}
