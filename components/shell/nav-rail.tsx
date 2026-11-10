"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import {
	Gauge,
	PanelLeftClose,
	PanelLeftOpen,
	Plus,
	Search,
	Sparkles,
	UsersRound,
} from "lucide-react";
import { formatDistanceToNowStrict } from "date-fns";
import { motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "@bprogress/next/app";
import { usePathname } from "next/navigation";
import {
	useCallback,
	useEffect,
	useId,
	useMemo,
	useRef,
	useState,
	useSyncExternalStore,
} from "react";
import { usePlanGate } from "@/components/billing/use-plan-gate";
import { BotDialogPanel } from "@/components/bot-dialog";
import { GroupChatAvatar } from "@/components/group-chat-avatar";
import { type GroupChatBot, GroupChatDialogPanel } from "@/components/group-chat-dialog";
import CommandPalette, {
	type CommandGroupDef,
} from "@/components/ui/command-palette";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { requestChangelogOpen } from "@/components/whats-new/store";
import { anchoredToast, toastPoint } from "@/components/ui/toast";
import { BOT_FEATURES, USAGE_PATH } from "@/lib/billing";
import { Tip, TooltipGroup } from "@/components/ui/tooltip";
import { useIsMac } from "@/hooks/use-is-mac";
import { SPRING_DETENT } from "@/lib/motion";
import { railLock, readRail, subscribeRail, writeRail } from "@/lib/shell/rail-store";
import { cn } from "@/lib/utils";
import type { ChatListItem } from "@/queries/chats";
import { EllumMark } from "./ellum-mark";
import { isActive, type NavItem, PRIMARY_NAV, SETTINGS_NAV } from "./nav";
import { circle, railRow, railTool } from "./styles";
import { ThemeToggle } from "./theme-toggle";

/*
  The rail expands (Shadow Garden admin's rail). Every entry is the same row —
  a 44px icon box, then a label — so collapsed it is the 84px icon rail, and
  expanded the rail simply widens: icons never move, labels fade in beside
  them. Tooltips only exist while collapsed; expanded, the label says it.
  They share one morphing tooltip (raven's TooltipGroup) that glides between
  triggers instead of re-opening. Below md, MobileTabBar takes over.

  Open/closed *looks* are `rail-open:` classes off <html data-rail>, which a
  prepaint script sets from the cookie (RAIL_PREPAINT), so a refresh paints
  the right width before React runs. `expanded` drives behaviour only
  (tooltips, aria, menu side) and must never pick classes or mount/unmount
  markup, or the fallback rail and the streamed one would differ.
*/

/** Labels: present for screen readers always, visible only when expanded. */
const reveal =
	"pointer-events-none opacity-0 rail-open:pointer-events-auto rail-open:opacity-100";

const label =
	"min-w-0 flex-1 truncate text-left text-[13.5px] whitespace-nowrap transition-opacity duration-200 ease-swell";

function isTyping(target: EventTarget | null) {
	const el = target as HTMLElement | null;
	return Boolean(
		el &&
		(el.tagName === "INPUT" ||
			el.tagName === "TEXTAREA" ||
			el.isContentEditable),
	);
}

type NavRailProps = {
	/** From the cookie: what `expanded` reads during hydration. */
	initialExpanded: boolean;
	chats: ChatListItem[];
	/** The user's bots, for picking group members. */
	bots: GroupChatBot[];
	className?: string;
};

export function NavRail(props: NavRailProps) {
	return <Rail {...props} pathname={usePathname()} />;
}

/**
 * The static shell's rail. A Suspense fallback sits outside its own boundary, so it can't
 * read the pathname on dynamic routes; "" matches no destination, so nothing is active yet.
 */
export function NavRailFallback(props: NavRailProps) {
	return <Rail {...props} pathname="" />;
}

function Rail({
	initialExpanded,
	chats,
	bots,
	className,
	pathname,
}: NavRailProps & { pathname: string }) {
	const indicatorId = useId();
	const { user } = useUser();
	const expanded = useSyncExternalStore(subscribeRail, readRail, () => initialExpanded);
	const createRef = useRef<HTMLButtonElement>(null);
	const [botOpen, setBotOpen] = useState(false);
	const [botOrigin, setBotOrigin] = useState<DOMRect | null>(null);
	const [groupOpen, setGroupOpen] = useState(false);
	const [groupOrigin, setGroupOrigin] = useState<DOMRect | null>(null);
	const router = useRouter();
	const plan = usePlanGate();
	const [searchOpen, setSearchOpen] = useState(false);

	const searchGroups = useMemo<CommandGroupDef[]>(
		() => [
			{
				id: "chats",
				heading: "Chats",
				commands: chats.map((chat) => {
					const href = `/c/${chat.id}`;
					return {
						id: chat.id,
						label: chat.name,
						media: <GroupChatAvatar seeds={chat.avatars} className="size-6" />,
						active: pathname === href,
						onRun: () => router.push(href),
					};
				}),
			},
		],
		[chats, pathname, router],
	);

	const expandRef = useRef<HTMLButtonElement>(null);
	const toggle = useCallback((event?: React.MouseEvent) => {
		const lock = railLock();
		if (lock) {
			// At the pointer for a click; a keyboard (`[`, or Enter, which reports detail 0) gets the Expand row.
			const anchor =
				event && event.detail > 0 ? toastPoint(event.clientX, event.clientY) : expandRef.current;
			// A fixed id: repeat presses move and refresh the one note instead of stacking.
			anchoredToast.add({
				id: "rail-locked",
				type: "info",
				title: "The sidebar stays collapsed here",
				description: lock,
				positionerProps: { anchor, side: "right" },
			});
			return;
		}
		writeRail(!readRail());
	}, []);

	// `[` toggles the rail, the way editors bind their sidebars.
	useEffect(() => {
		function onKey(e: KeyboardEvent) {
			if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
			if (e.key === "[") {
				e.preventDefault();
				toggle();
			}
		}
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [toggle]);

	return (
		<div
			className={cn(
				"group/rail sticky top-0 z-10 h-svh shrink-0",
				"transition-[width] duration-300 ease-detent motion-reduce:transition-none",
				"w-[84px] rail-open:w-[248px]",
				className,
			)}
		>
			<nav
				aria-label="Primary"
				className={cn(
					"flex size-full flex-col gap-4 overflow-x-hidden overflow-y-auto bg-band px-5 py-5 scrollbar-none",
					"dark:border-r dark:border-glass-border",
				)}
			>
				<TooltipGroup side="right" sideOffset={12}>
					{/* One trigger the layout moves: under the logo when collapsed, beside it
					    when expanded, where the row spans the capsule's outer edges (its
					    -mx-1.5) so logo and "+" line up with it. */}
					<DropdownMenu>
						<div
							className={cn(
								"flex flex-col items-stretch gap-4 transition-[margin] duration-300 ease-detent motion-reduce:transition-none",
								"rail-open:-mx-1.5 rail-open:flex-row rail-open:items-center rail-open:gap-2",
							)}
						>
							<Link
								href="/"
								aria-label="Ellum home"
								className="flex min-w-0 flex-1 items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
							>
								{/* Shrinks when expanded, giving the name room before the "+". */}
								<EllumMark
									className={cn(
										"size-11 shrink-0 transition-[width,height] duration-300 ease-detent motion-reduce:transition-none rail-open:size-9",
									)}
								/>
								<span
									className={cn(
										label,
										"font-display text-[15px] font-semibold tracking-[-0.01em] text-ink",
										reveal,
									)}
								>
									EllumHarness
								</span>
							</Link>
							<CreateTrigger ref={createRef} tip={!expanded} />
						</div>
						<DropdownMenuContent
							side={expanded ? "bottom" : "right"}
							align={expanded ? "end" : "start"}
							sideOffset={expanded ? 8 : 12}
							className="w-56 rounded-2xl p-1.5 shadow-lift"
						>
							<DropdownMenuItem
								className="gap-2.5 rounded-xl px-2.5 py-2"
								onClick={() => {
									if (!plan.allows(BOT_FEATURES)) return;
									setBotOrigin(createRef.current?.getBoundingClientRect() ?? null);
									setBotOpen(true);
								}}
							>
								<Plus />
								Create new bot
							</DropdownMenuItem>
							<DropdownMenuItem
								className="gap-2.5 rounded-xl px-2.5 py-2"
								onClick={() => {
									setGroupOrigin(createRef.current?.getBoundingClientRect() ?? null);
									setGroupOpen(true);
								}}
							>
								<UsersRound />
								Create group chat
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
					<SearchTrigger tip={!expanded} onOpen={() => setSearchOpen(true)} />
					<BotDialogPanel
						open={botOpen}
						onOpenChange={setBotOpen}
						origin={botOrigin}
					/>
					<GroupChatDialogPanel
						open={groupOpen}
						onOpenChange={setGroupOpen}
						origin={groupOrigin}
						bots={bots}
					/>
					<CommandPalette
						open={searchOpen}
						onOpenChange={setSearchOpen}
						groups={searchGroups}
						placeholder="Search chats…"
						fixed
					/>

					<div className="-mx-1.5 mt-2 flex flex-col gap-1.5 rounded-card bg-sheet p-1.5 ring-1 ring-border dark:bg-card-nested dark:ring-glass-border">
						{PRIMARY_NAV.map((item) => (
							<NavLink
								key={item.href}
								item={item}
								active={isActive(pathname, item.href)}
								tip={!expanded}
								indicatorId={indicatorId}
								// The capsule is sheet, so hover tints to card.
								hover="hover:bg-card dark:hover:bg-accent"
							/>
						))}
					</div>

					{chats.length > 0 && (
						<ChatList chats={chats} pathname={pathname} tip={!expanded} />
					)}

					<div className="mt-auto flex flex-col gap-3">
						<Tip
							label={
								<>
									Expand <Kbd>[</Kbd>
								</>
							}
							disabled={expanded}
							render={
								<button
									ref={expandRef}
									type="button"
									onClick={toggle}
									aria-expanded={expanded}
									aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
									className={cn(
										railRow,
										// Only while the pointer is over the rail (or a keyboard lands on
										// it); it keeps its slot so the foot never shifts.
										"opacity-0 transition-[opacity,background-color] group-hover/rail:opacity-100 focus-visible:opacity-100",
									)}
								/>
							}
						>
							<span
								className={cn(circle, "text-ink-2 group-hover:text-foreground")}
							>
								<PanelLeftClose className="hidden rail-open:block" />
								<PanelLeftOpen className="rail-open:hidden" />
							</span>
							<span
								className={cn(
									label,
									"text-ink-2 group-hover:text-foreground",
									reveal,
								)}
							>
								Collapse
							</span>
						</Tip>

						<ThemeToggle
							tip={!expanded}
							label={
								<span
									className={cn(
										label,
										"text-ink-2 group-hover:text-foreground",
										reveal,
									)}
								>
									Theme
								</span>
							}
						/>

						<NavLink
							item={SETTINGS_NAV}
							active={isActive(pathname, SETTINGS_NAV.href)}
							tip={!expanded}
							indicatorId={indicatorId}
							// On the band, like the rows around it.
							hover="hover:bg-sheet dark:hover:bg-accent"
						/>

						{/* Clerk owns the trigger; a pseudo-element stretches its hit area over the
						    whole row (box and trigger made static so it sizes to this row). */}
						<div
							className={cn(
								railRow,
								"relative has-focus-visible:ring-2 has-focus-visible:ring-ring",
							)}
						>
							<div className="grid size-11 shrink-0 place-items-center">
								<UserButton
									appearance={{
										elements: {
											rootBox: "static!",
											userButtonBox: "static!",
											userButtonTrigger:
												"static! focus:shadow-none! before:absolute before:inset-0 before:rounded-full before:content-['']",
										},
									}}
								>
									<UserButton.MenuItems>
										<UserButton.Link
											label="Usage"
											labelIcon={<Gauge className="size-4" />}
											href={USAGE_PATH}
										/>
										<UserButton.Action
											label="What's new"
											labelIcon={<Sparkles className="size-4" />}
											onClick={requestChangelogOpen}
										/>
									</UserButton.MenuItems>
								</UserButton>
							</div>
							<div
								className={cn(
									"flex min-w-0 flex-1 flex-col transition-opacity duration-200 ease-swell",
									reveal,
								)}
							>
								<span className="truncate text-[13px] font-medium whitespace-nowrap text-ink">
									{user?.fullName ?? user?.username ?? ""}
								</span>
								<span className="truncate font-mono text-[11px] whitespace-nowrap text-ink-3">
									{user?.primaryEmailAddress?.emailAddress ?? ""}
								</span>
							</div>
						</div>
					</div>
				</TooltipGroup>
			</nav>
			{/* The edge itself toggles the rail, as shadcn's SidebarRail does. Out of
			    the tab order: the Collapse row and `[` cover keyboards. Kept inside
			    the wrapper: overhanging the sticky, width-animating layer left a
			    stale white sliver over the sheet until the next repaint. */}
			<button
				type="button"
				tabIndex={-1}
				aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
				title={expanded ? "Collapse sidebar" : "Expand sidebar"}
				onClick={toggle}
				className={cn(
					"absolute inset-y-0 right-0 z-20 w-3 outline-none",
					"after:absolute after:inset-y-0 after:right-0 after:w-0.5 after:transition-colors after:duration-200",
					"hover:after:bg-border dark:hover:after:bg-glass-border",
					"cursor-e-resize rail-open:cursor-w-resize",
				)}
			/>
		</div>
	);
}

/** A destination row. The active pill shares one layoutId, so it springs between the capsule and the foot. */
function NavLink({
	item: { href, label: text, icon: Icon },
	active,
	tip,
	indicatorId,
	hover,
}: {
	item: NavItem;
	active: boolean;
	tip: boolean;
	indicatorId: string;
	/** The resting surface differs (capsule vs band), so the caller picks the tint. */
	hover: string;
}) {
	return (
		<Tip
			label={text}
			disabled={!tip}
			render={
				<Link
					href={href}
					aria-current={active ? "page" : undefined}
					className={cn(
						"group relative isolate flex h-11 w-full items-center gap-3 rounded-full outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring",
						active
							? "text-primary-foreground dark:text-signal"
							: cn("text-ink-2 hover:text-foreground", hover),
					)}
				/>
			}
		>
			{active && (
				<motion.span
					layoutId={indicatorId}
					aria-hidden
					transition={SPRING_DETENT}
					className="absolute inset-0 -z-10 rounded-full bg-primary dark:bg-signal-soft dark:shadow-glow"
				/>
			)}
			<span className="grid size-11 shrink-0 place-items-center [&_svg]:size-4.5">
				<Icon strokeWidth={1.75} />
			</span>
			<span className={cn(label, reveal, active && "font-medium")}>{text}</span>
		</Tip>
	);
}

/** The user's chats, newest first. Collapsed, only the faces remain. */
function ChatList({
	chats,
	pathname,
	tip,
}: {
	chats: ChatListItem[];
	pathname: string;
	/** Tooltips only while collapsed. */
	tip: boolean;
}) {
	const indicatorId = useId();
	return (
		// Same capsule as the nav group; scrolls inside once it outgrows the rail.
		// layoutScroll: the indicator measures rows inside a scroller, so motion must account for its offset.
		<motion.section
			layoutScroll
			aria-label="Chats"
			className="-mx-1.5 flex min-h-0 flex-col gap-1.5 overflow-y-auto rounded-card bg-sheet p-1.5 ring-1 ring-border scrollbar-none dark:bg-card-nested dark:ring-glass-border"
		>
			{chats.map((chat) => {
				const href = `/c/${chat.id}`;
				const active = pathname === href;
				return (
					<Tip
						key={chat.id}
						label={chat.name}
						disabled={!tip}
						render={
							<Link
								href={href}
								aria-current={active ? "page" : undefined}
								className={cn(
									"group relative isolate flex h-13 w-full shrink-0 items-center gap-3 rounded-full outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring",
									// The capsule is sheet, so rows tint to card like the nav rows above.
									!active && "hover:bg-card dark:hover:bg-accent",
								)}
							/>
						}
					>
						{/* One indicator springs between chats like the nav pill. Collapsed, only the face shows, so the ring sits on it. */}
						{active && (
							<motion.span
								layoutId={indicatorId}
								aria-hidden
								transition={SPRING_DETENT}
								className="absolute inset-0 -z-10 rounded-full bg-signal-soft"
							>
								{/* Expanded, the tinted row and bold name carry it; the ring would double up. */}
								<span className="absolute inset-y-1 left-0 w-11 rounded-full ring-2 ring-signal transition-[box-shadow] duration-200 ease-swell rail-open:ring-transparent dark:shadow-glow dark:rail-open:shadow-none" />
							</motion.span>
						)}
						<span className="grid size-11 shrink-0 place-items-center">
							<GroupChatAvatar seeds={chat.avatars} className="size-9" />
						</span>
						<span
							className={cn(
								"flex min-w-0 flex-1 flex-col pr-3 transition-opacity duration-200 ease-swell",
								reveal,
							)}
						>
							<span className="flex items-baseline gap-2 whitespace-nowrap">
								<span
									className={cn(
										"min-w-0 flex-1 truncate text-[13.5px] text-ink",
										active && "font-medium",
									)}
								>
									{chat.name}
								</span>
								{/* Relative to "now", which differs by a hair between server and client. */}
								<time
									dateTime={chat.lastMessageAt.toISOString()}
									suppressHydrationWarning
									className="shrink-0 text-[11px] text-ink-3"
								>
									{formatDistanceToNowStrict(chat.lastMessageAt)}
								</time>
							</span>
							<span className="truncate text-[12px] whitespace-nowrap text-ink-3">
								{chat.preview ?? "No messages yet"}
							</span>
						</span>
					</Tip>
				);
			})}
		</motion.section>
	);
}

/** Opens the chat palette (also ⌘K / Ctrl+K). Collapsed it matches the "+"; expanded it reads as a field. */
function SearchTrigger({ tip, onOpen }: { tip: boolean; onOpen: () => void }) {
	const isMac = useIsMac();
	const shortcut = (
		<KbdGroup>
			<Kbd>{isMac ? "⌘" : "Ctrl"}</Kbd>
			<Kbd>K</Kbd>
		</KbdGroup>
	);
	return (
		<Tip
			label={<>Search {shortcut}</>}
			disabled={!tip}
			render={
				<button
					type="button"
					onClick={onOpen}
					aria-label="Search chats"
					aria-keyshortcuts={isMac ? "Meta+K" : "Control+K"}
					className={cn(
						railTool,
						"mx-auto [&_svg]:size-4.5",
						// Expanded it reads as a field: the tile at rest, spanning the capsule's edges.
						"rail-open:-mx-1.5 rail-open:w-auto rail-open:justify-start rail-open:gap-2 rail-open:px-2.5 rail-open:text-sm",
						"rail-open:bg-sheet rail-open:ring-border dark:rail-open:bg-card-nested dark:rail-open:ring-glass-border",
					)}
				/>
			}
		>
			<Search />
			<span className="hidden min-w-0 flex-1 truncate text-left rail-open:block">
				Search chats
			</span>
			<span className="hidden rail-open:contents">{shortcut}</span>
		</Tip>
	);
}

/** The rail's "+": opens the create menu. Collapsed it carries a tooltip. */
function CreateTrigger({
	ref,
	tip,
}: {
	ref: React.Ref<HTMLButtonElement>;
	tip: boolean;
}) {
	return (
		<Tip
			label="Create"
			disabled={!tip}
			render={
				<DropdownMenuTrigger
					ref={ref}
					aria-label="Create"
					className={cn(railTool, "self-center rail-open:self-auto [&_svg]:size-6")}
				/>
			}
		>
			<Plus strokeWidth={1.75} />
		</Tip>
	);
}
